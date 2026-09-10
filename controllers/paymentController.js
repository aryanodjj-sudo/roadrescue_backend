import Payment from "../models/Payment.js";
import asyncHandler from "../utils/asyncHandler.js";

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

export { getPaymentByRequest };