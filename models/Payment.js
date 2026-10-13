import mongoose from "mongoose";

// Represents an invoice/payment record for a completed service request.
// Backed by Razorpay in test mode: a Payment is created with status
// "unpaid" the moment a request is marked Completed, and flips to "paid"
// once the customer completes checkout and the signature is verified.
const paymentSchema = new mongoose.Schema(
  {
    serviceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRequest",
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceCharge: { type: Number, required: true },
    additionalCharges: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;