import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Snapshot of the submitter's role at creation time, so the admin
    // list/filter doesn't need to re-populate + re-check the user later.
    submittedByRole: {
      type: String,
      enum: ["user", "mechanic"],
      required: true,
    },
    type: {
      type: String,
      enum: ["Complaint", "Dispute"],
      required: true,
    },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    serviceRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceRequest",
      default: null,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
    },
    adminNote: { type: String, default: "" },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const Complaint = mongoose.model("Complaint", complaintSchema);
export default Complaint;