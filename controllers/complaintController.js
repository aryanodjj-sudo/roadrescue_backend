import Complaint from "../models/Complaint.js";
import ServiceRequest from "../models/ServiceRequest.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  POST /api/complaints
// @access Private (user or mechanic)
// Body: { type: "Complaint" | "Dispute", subject, description, serviceRequestId? }
const createComplaint = asyncHandler(async (req, res) => {
  const { type, subject, description, serviceRequestId } = req.body;

  if (!type || !["Complaint", "Dispute"].includes(type)) {
    res.status(400);
    throw new Error('type must be "Complaint" or "Dispute"');
  }
  if (!subject || !description) {
    res.status(400);
    throw new Error("subject and description are required");
  }

  let serviceRequest = null;
  if (serviceRequestId) {
    const request = await ServiceRequest.findById(serviceRequestId);
    if (!request) {
      res.status(404);
      throw new Error("Service request not found");
    }

    // Only let someone attach a complaint to a request they were actually
    // part of — either as the customer or as the mechanic who took the job.
    const isOwner = request.user.toString() === req.user._id.toString();
    const isAssignedMechanic =
      request.acceptedBy &&
      request.acceptedBy.toString() === req.user._id.toString();

    if (!isOwner && !isAssignedMechanic) {
      res.status(403);
      throw new Error(
        "You can only raise a complaint or dispute about your own request"
      );
    }
    serviceRequest = request._id;
  }

  const complaint = await Complaint.create({
    submittedBy: req.user._id,
    submittedByRole: req.user.role,
    type,
    subject,
    description,
    serviceRequest,
  });

  res.status(201).json({ success: true, complaint });
});

// @route  GET /api/complaints/mine
// @access Private (user or mechanic)
const getMyComplaints = asyncHandler(async (req, res) => {
  const complaints = await Complaint.find({ submittedBy: req.user._id })
    .populate("serviceRequest")
    .sort({ createdAt: -1 });

  res.json({ success: true, complaints });
});

export { createComplaint, getMyComplaints };