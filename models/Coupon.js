import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: { type: String, enum: ["percentage", "flat"], required: true },
    discountValue: { type: Number, required: true },
    maxDiscount: { type: Number, default: null }, // cap for percentage discounts
    minOrderValue: { type: Number, default: 0 },
    expiryDate: { type: Date, default: null },
    usageLimit: { type: Number, default: null }, // null = unlimited
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Coupon", couponSchema);