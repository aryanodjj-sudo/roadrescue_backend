import crypto from "crypto";
import Razorpay from "razorpay";
import Payment from "../models/Payment.js";
import asyncHandler from "../utils/asyncHandler.js";

// Lazy init: server start par crash na ho agar keys missing hain;
// error sirf tab aayega jab payment API actually use ho.
let razorpayInstance;
const getRazorpay = () => {
  if (!razorpayInstance) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        "Razorpay keys missing: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment"
      );
    }
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
};

// @route  GET /api/payments/:requestId
// @access Private (the request's owner, or admin)
const getPaymentByRequest = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    serviceRequest: req.params.requestId,
  });

  if (!payment) {
    res.status(404);
    throw new Error("No invoice found for this request yet");
  }

  if (
    payment.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(403);
    throw new Error("Not authorized to view this invoice");
  }

  res.json({ success: true, payment });
});

// @route  POST /api/payments/:requestId/create-order
// @access Private (the invoice's owner)
// Creates a Razorpay order for the already-computed invoice total.
// The amount is never taken from the client — only ever read from our
// own Payment record, so there's no way to pay a tampered amount.
const createOrder = asyncHandler(async (req, res) => {
  const payment = await Payment.findOne({
    serviceRequest: req.params.requestId,
  });

  if (!payment) {
    res.status(404);
    throw new Error("No invoice found for this request yet");
  }

  if (payment.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to pay this invoice");
  }

  if (payment.status === "paid") {
    res.status(400);
    throw new Error("This invoice has already been paid");
  }

  const order = await getRazorpay().orders.create({
    amount: Math.round(payment.total * 100), // paise
    currency: "INR",
    receipt: `rr_${payment.serviceRequest}`,
  });

  payment.razorpayOrderId = order.id;
  await payment.save();

  res.json({
    success: true,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

// @route  POST /api/payments/:requestId/verify
// @access Private (the invoice's owner)
// Verifies the HMAC-SHA256 signature Razorpay returns after checkout,
// using our own key_secret — this is the only trustworthy way to confirm
// a payment actually succeeded (the client-side success callback alone
// can be spoofed, the signature cannot be, without the secret).
const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const payment = await Payment.findOne({
    serviceRequest: req.params.requestId,
  });

  if (!payment) {
    res.status(404);
    throw new Error("No invoice found for this request yet");
  }

  if (payment.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to pay this invoice");
  }

  if (payment.razorpayOrderId !== razorpay_order_id) {
    res.status(400);
    throw new Error("Order mismatch — please try paying again");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    res.status(400);
    throw new Error("Payment verification failed");
  }

  payment.status = "paid";
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.paidAt = new Date();
  await payment.save();

  res.json({ success: true, payment });
});

export { getPaymentByRequest, createOrder, verifyPayment };