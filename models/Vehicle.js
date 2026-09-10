import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    type: {
      type: String,
      enum: ["Car", "Motorcycle", "SUV", "Truck", "Van"],
      default: "Car",
    },
    plateNumber: { type: String, required: true, trim: true },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

vehicleSchema.index({ owner: 1 });

const Vehicle = mongoose.model("Vehicle", vehicleSchema);
export default Vehicle;
