import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      enum: ["breakdown", "towing", "battery", "tyre", "fuel"],
    },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    estimatedPriceMin: { type: Number, default: 0 },
    estimatedPriceMax: { type: Number, default: 0 },
    estimatedTimeMinutes: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);
export default Service;
