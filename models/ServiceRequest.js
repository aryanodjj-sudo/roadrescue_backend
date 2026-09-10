import mongoose from "mongoose";

// Keep these EXACTLY in sync with the frontend's REQUEST_STATUSES
// (src/context/ServiceRequestContext.jsx) so the UI never has to
// translate between backend and frontend status vocabularies.
export const REQUEST_STATUSES = [
  "Pending",
  "Accepted",
  "On The Way",
  "Arrived",
  "In Progress",
  "Completed",
  "Cancelled",
];

// Only these forward transitions are valid. Enforced server-side in the
// controller so a client can never skip steps (e.g. Pending -> Completed).
export const VALID_TRANSITIONS = {
  Pending: ["Accepted", "Cancelled"],
  Accepted: ["On The Way", "Cancelled"],
  "On The Way": ["Arrived", "Cancelled"],
  Arrived: ["In Progress", "Cancelled"],
  "In Progress": ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: { type: String, enum: REQUEST_STATUSES, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const serviceRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    serviceType: {
      type: String,
      required: true,
      enum: ["breakdown", "towing", "battery", "tyre", "fuel"],
    },
    description: { type: String, default: "" },

    // The mechanic PROFILE the request was sent to (chosen from the nearby
    // list). Distinct from `acceptedBy`, which is set only once a mechanic
    // actually accepts — mirrors the frontend's mechanic vs mechanicId split.
    mechanic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mechanic",
      required: true,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    customerLocation: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: "Pending",
    },
    statusHistory: {
      type: [statusHistoryEntrySchema],
      default: () => [{ status: "Pending", at: new Date() }],
    },

    pricePerVisit: { type: Number, default: 0 },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ user: 1, status: 1 });
serviceRequestSchema.index({ mechanic: 1, status: 1 });
serviceRequestSchema.index({ acceptedBy: 1, status: 1 });

const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);
export default ServiceRequest;
