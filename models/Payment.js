import mongoose from "mongoose";

// Represents an invoice/payment record for a completed service request.
// NOTE: this does NOT process real payments — no gateway is integrated.
// It only stores the amount breakdown so Invoice.jsx has real data to show.
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
  },
  { timestamps: true }
);

const Payment = mongoose.model("Payment", paymentSchema);
export default Payment;
