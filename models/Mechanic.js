import mongoose from "mongoose";

const mechanicSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    services: [
      {
        type: String,
        enum: ["breakdown", "towing", "battery", "tyre", "fuel"],
      },
    ],
    pricePerVisit: { type: Number, default: 0 },
    experienceYears: { type: Number, default: 0 },
    serviceArea: { type: String, default: "" },
    bio: { type: String, default: "" },

    // Live location — used for nearby-mechanic distance calculation
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    isOnline: { type: Boolean, default: false },

    verification: {
      status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending",
      },
      documents: [{ type: String }], // file URLs, once file upload exists
      reviewedAt: { type: Date, default: null },
    },

    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Mechanic = mongoose.model("Mechanic", mechanicSchema);
export default Mechanic;
