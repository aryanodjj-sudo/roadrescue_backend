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

// Structured delivery address — used only when the request is booked on
// behalf of someone else, so the mechanic knows exactly where to go
// without needing a paid map/geocoding API.
const manualAddressSchema = new mongoose.Schema(
  {
    line: { type: String, default: null },
    landmark: { type: String, default: null },
    city: { type: String, default: null },
    pincode: { type: String, default: null },
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

    bookingForSomeoneElse: { type: Boolean, default: false },
    recipientName: { type: String, default: null },
    recipientPhone: { type: String, default: null },
    manualAddress: { type: manualAddressSchema, default: null },

    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: "Pending",
    },
    statusHistory: {
      type: [statusHistoryEntrySchema],
      default: () => [{ status: "Pending", at: new Date() }],
    },

    // Pricing — pricePerVisit is what's actually charged (already
    // discounted / zero if covered by subscription). originalPrice is
    // kept so invoices can always show "what it would've cost".
    pricePerVisit: { type: Number, default: 0 },
    originalPrice: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String, default: null },
    viaSubscription: { type: Boolean, default: false },

    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

serviceRequestSchema.index({ user: 1, status: 1 });
serviceRequestSchema.index({ mechanic: 1, status: 1 });
serviceRequestSchema.index({ acceptedBy: 1, status: 1 });

const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);
export default ServiceRequest;