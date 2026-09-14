import User from "../models/User.js";
import Mechanic from "../models/Mechanic.js";
import Vehicle from "../models/Vehicle.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Payment from "../models/Payment.js";
import Complaint from "../models/Complaint.js";
import Review from "../models/Review.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  GET /api/admin/users
// @access Private (admin)
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ role: "user" }).sort({ createdAt: -1 });

  // Attach vehicle count + request count per user (small dataset assumption;
  // fine for this platform's scale — revisit with aggregation if it grows)
  const enriched = await Promise.all(
    users.map(async (u) => {
      const [vehicleCount, requestCount] = await Promise.all([
        Vehicle.countDocuments({ owner: u._id }),
        ServiceRequest.countDocuments({ user: u._id }),
      ]);
      return {
        id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        createdAt: u.createdAt,
        vehicleCount,
        requestCount,
      };
    })
  );

  res.json({ success: true, users: enriched });
});

// @route  GET /api/admin/mechanics
// @access Private (admin)
const getMechanics = asyncHandler(async (req, res) => {
  const mechanics = await Mechanic.find()
    .populate("user", "name email phone createdAt")
    .sort({ createdAt: -1 });

  res.json({ success: true, mechanics });
});

// @route  PUT /api/admin/mechanics/:id/verify
// @access Private (admin)
// Body: { status: "Approved" | "Rejected" }
const verifyMechanic = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (!["Approved", "Rejected"].includes(status)) {
    res.status(400);
    throw new Error('status must be "Approved" or "Rejected"');
  }

  const mechanic = await Mechanic.findById(req.params.id);
  if (!mechanic) {
    res.status(404);
    throw new Error("Mechanic not found");
  }

  mechanic.verification.status = status;
  mechanic.verification.reviewedAt = new Date();
  if (status === "Rejected") mechanic.isOnline = false;

  const updated = await mechanic.save();
  res.json({ success: true, mechanic: updated });
});

// @route  GET /api/admin/service-requests
// @access Private (admin)
// Optional query: status
const getServiceRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const requests = await ServiceRequest.find(filter)
    .populate("user", "name email")
    .populate({ path: "mechanic", populate: { path: "user", select: "name" } })
    .populate("vehicle")
    .sort({ createdAt: -1 });

  res.json({ success: true, requests });
});

// @route  GET /api/admin/reports
// @access Private (admin)
const getReports = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    totalMechanics,
    verifiedMechanics,
    pendingVerifications,
    activeRequests,
    completedRequests,
    cancelledRequests,
    revenueAgg,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    Mechanic.countDocuments(),
    Mechanic.countDocuments({ "verification.status": "Approved" }),
    Mechanic.countDocuments({ "verification.status": "Pending" }),
    ServiceRequest.countDocuments({
      status: { $nin: ["Completed", "Cancelled"] },
    }),
    ServiceRequest.countDocuments({ status: "Completed" }),
    ServiceRequest.countDocuments({ status: "Cancelled" }),
    Payment.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);

  res.json({
    success: true,
    reports: {
      totalUsers,
      totalMechanics,
      verifiedMechanics,
      pendingVerifications,
      activeRequests,
      completedRequests,
      cancelledRequests,
      totalRevenue: revenueAgg[0]?.total || 0,
    },
  });
});

// @route  GET /api/admin/complaints
// @access Private (admin)
// Optional query: type ("Complaint" | "Dispute"), status
const getComplaints = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;

  const complaints = await Complaint.find(filter)
    .populate("submittedBy", "name email role")
    .populate({
      path: "serviceRequest",
      populate: [
        { path: "vehicle" },
        { path: "mechanic", populate: { path: "user", select: "name" } },
      ],
    })
    .sort({ createdAt: -1 });

  res.json({ success: true, complaints });
});

// @route  PUT /api/admin/complaints/:id/status
// @access Private (admin)
// Body: { status: "Pending" | "In Progress" | "Resolved", adminNote? }
const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { status, adminNote } = req.body;

  if (!["Pending", "In Progress", "Resolved"].includes(status)) {
    res.status(400);
    throw new Error(
      'status must be "Pending", "In Progress" or "Resolved"'
    );
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    res.status(404);
    throw new Error("Complaint not found");
  }

  complaint.status = status;
  if (adminNote !== undefined) complaint.adminNote = adminNote;
  complaint.resolvedAt = status === "Resolved" ? new Date() : null;

  const updated = await complaint.save();
  res.json({ success: true, complaint: updated });
});

// @route  GET /api/admin/reviews
// @access Private (admin)
// Platform-wide reviews list — used to replace the mock reviews shown
// previously in Services & Reviews, now backed by real customer reviews.
const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({})
    .populate("user", "name")
    .populate({ path: "mechanic", populate: { path: "user", select: "name" } })
    .populate("serviceRequest", "serviceType")
    .sort({ createdAt: -1 });

  res.json({ success: true, reviews });
});

export {
  getUsers,
  getMechanics,
  verifyMechanic,
  getServiceRequests,
  getReports,
  getComplaints,
  updateComplaintStatus,
  getReviews,
};