import ServiceRequest, {
  VALID_TRANSITIONS,
} from "../models/ServiceRequest.js";
import Vehicle from "../models/Vehicle.js";
import Mechanic from "../models/Mechanic.js";
import Notification from "../models/Notification.js";
import Payment from "../models/Payment.js";
import Review from "../models/Review.js";
import asyncHandler from "../utils/asyncHandler.js";
import { emitToUser } from "../utils/socket.js";
import { isValidCoord } from "../utils/validateCoords.js";

async function notify(userId, message, serviceRequestId = null) {
  const notification = await Notification.create({
    user: userId,
    message,
    serviceRequest: serviceRequestId,
  });
  // Real-time push so Notifications.jsx / the bell badge update instantly
  // instead of waiting for the next manual refresh.
  emitToUser(userId, "notification:new", {
    id: notification._id,
    message: notification.message,
    createdAt: notification.createdAt,
    read: false,
  });
}

// Tells both sides of a request to silently refetch — used after any
// status-changing action so both the customer's and the (once accepted)
// mechanic's UI stay in sync without polling.
function broadcastRequestUpdate(request) {
  emitToUser(request.user.toString(), "request:updated", {
    requestId: request._id.toString(),
  });
  if (request.acceptedBy) {
    emitToUser(request.acceptedBy.toString(), "request:updated", {
      requestId: request._id.toString(),
    });
  }
}

// @route  POST /api/service-requests
// @access Private (user)
const createServiceRequest = asyncHandler(async (req, res) => {
  const { vehicleId, serviceType, description, mechanicId, customerLocation } =
    req.body;

  if (!vehicleId || !serviceType || !mechanicId) {
    res.status(400);
    throw new Error("vehicleId, serviceType and mechanicId are required");
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle || vehicle.owner.toString() !== req.user._id.toString()) {
    res.status(404);
    throw new Error("Vehicle not found for this account");
  }

  const mechanic = await Mechanic.findById(mechanicId);
  if (!mechanic) {
    res.status(404);
    throw new Error("Mechanic not found");
  }

  if (
    customerLocation &&
    !isValidCoord(customerLocation.lat, customerLocation.lng)
  ) {
    res.status(400);
    throw new Error("Invalid customer location coordinates");
  }

  const request = await ServiceRequest.create({
    user: req.user._id,
    vehicle: vehicle._id,
    serviceType,
    description,
    mechanic: mechanic._id,
    customerLocation,
    pricePerVisit: mechanic.pricePerVisit,
  });

  await notify(
    req.user._id,
    `Request sent for ${serviceType}. Waiting for a mechanic to accept.`,
    request._id
  );

  // Real-time: the target mechanic's Incoming Requests tab updates
  // immediately instead of waiting for their next manual refresh/poll.
  emitToUser(mechanic.user.toString(), "request:new", {
    requestId: request._id.toString(),
  });

  const populated = await ServiceRequest.findById(request._id)
    .populate("vehicle")
    .populate("user", "name email phone")
    .populate({ path: "mechanic", populate: { path: "user", select: "name" } });

  res.status(201).json({ success: true, request: populated });
});

// @route  GET /api/service-requests
// @access Private
// Returns requests scoped to the caller's role:
//   user      -> requests they created
//   mechanic  -> requests sent to their Mechanic profile (incoming + own accepted)
//   admin     -> everything (no filter)
const getServiceRequests = asyncHandler(async (req, res) => {
  let filter = {};

  if (req.user.role === "user") {
    filter = { user: req.user._id };
  } else if (req.user.role === "mechanic") {
    const mechanicProfile = await Mechanic.findOne({ user: req.user._id });
    if (!mechanicProfile) {
      return res.json({ success: true, requests: [] });
    }
    filter = { mechanic: mechanicProfile._id };
  }

  const requests = await ServiceRequest.find(filter)
    .populate("vehicle")
    .populate("user", "name email phone")
    .populate({ path: "mechanic", populate: { path: "user", select: "name" } })
    .sort({ createdAt: -1 });

  // Attach each request's review (if any) so the frontend doesn't need a
  // second round trip to know whether it's already been reviewed.
  const reviews = await Review.find({
    serviceRequest: { $in: requests.map((r) => r._id) },
  });
  const reviewMap = new Map(reviews.map((rv) => [rv.serviceRequest.toString(), rv]));

  const withReviews = requests.map((r) => {
    const obj = r.toObject();
    const review = reviewMap.get(r._id.toString());
    obj.review = review
      ? { rating: review.rating, comment: review.comment, createdAt: review.createdAt }
      : null;
    return obj;
  });

  res.json({ success: true, requests: withReviews });
});

// @route  GET /api/service-requests/:id
// @access Private
const getServiceRequestById = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id)
    .populate("vehicle")
    .populate("user", "name email phone")
    .populate({ path: "mechanic", populate: { path: "user", select: "name" } });

  if (!request) {
    res.status(404);
    throw new Error("Service request not found");
  }

  const isOwner = request.user._id.toString() === req.user._id.toString();
  const isAssignedMechanic =
    request.acceptedBy && request.acceptedBy.toString() === req.user._id.toString();

  if (!isOwner && !isAssignedMechanic && req.user.role !== "admin") {
    res.status(403);
    throw new Error("Not authorized to view this request");
  }

  const review = await Review.findOne({ serviceRequest: request._id });
  const obj = request.toObject();
  obj.review = review
    ? { rating: review.rating, comment: review.comment, createdAt: review.createdAt }
    : null;

  res.json({ success: true, request: obj });
});

// @route  PUT /api/service-requests/:id/accept
// @access Private (mechanic)
const acceptServiceRequest = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error("Service request not found");
  }

  // SECURITY: only the mechanic the request was actually sent to may accept
  // it. Without this check, any authenticated mechanic could accept any
  // other mechanic's pending request just by knowing its id.
  const mechanicProfile = await Mechanic.findOne({ user: req.user._id });
  if (!mechanicProfile || request.mechanic.toString() !== mechanicProfile._id.toString()) {
    res.status(403);
    throw new Error("This request was not sent to you");
  }

  if (request.status !== "Pending") {
    res.status(400);
    throw new Error(`Cannot accept a request with status "${request.status}"`);
  }

  request.status = "Accepted";
  request.acceptedBy = req.user._id;
  request.statusHistory.push({ status: "Accepted", at: new Date() });
  await request.save();

  await notify(
    request.user,
    `${req.user.name} accepted your ${request.serviceType} request.`,
    request._id
  );
  broadcastRequestUpdate(request);

  res.json({ success: true, request });
});

// @route  PUT /api/service-requests/:id/status
// @access Private (mechanic who accepted the job)
const updateServiceRequestStatus = asyncHandler(async (req, res) => {
  const { status: newStatus } = req.body;
  const request = await ServiceRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error("Service request not found");
  }

  if (!request.acceptedBy || request.acceptedBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the assigned mechanic can update this request");
  }

  const allowedNext = VALID_TRANSITIONS[request.status] || [];
  if (!allowedNext.includes(newStatus)) {
    res.status(400);
    throw new Error(`Invalid status transition: "${request.status}" -> "${newStatus}"`);
  }

  request.status = newStatus;
  request.statusHistory.push({ status: newStatus, at: new Date() });

  if (newStatus === "Completed") {
    request.completedAt = new Date();
    // MOCK — no real payment gateway exists yet, so a completed job is
    // marked "paid" immediately just so the Admin Reports revenue number
    // isn't permanently stuck at ₹0. Once a real gateway is integrated,
    // this should go back to "unpaid" until the gateway confirms payment.
    await Payment.create({
      serviceRequest: request._id,
      user: request.user,
      serviceCharge: request.pricePerVisit,
      additionalCharges: 0,
      total: request.pricePerVisit,
      status: "paid",
    });
  }

  await request.save();

  await notify(request.user, `Your request status is now "${newStatus}".`, request._id);
  broadcastRequestUpdate(request);

  res.json({ success: true, request });
});

// @route  PUT /api/service-requests/:id/cancel
// @access Private (owner, the assigned mechanic, or — while still Pending —
// the mechanic the request was sent to, i.e. a "reject before accepting")
const cancelServiceRequest = asyncHandler(async (req, res) => {
  const request = await ServiceRequest.findById(req.params.id);

  if (!request) {
    res.status(404);
    throw new Error("Service request not found");
  }

  const isOwner = request.user.toString() === req.user._id.toString();
  const isAssignedMechanic =
    request.acceptedBy && request.acceptedBy.toString() === req.user._id.toString();

  let isTargetMechanicBeforeAccept = false;
  if (
    !isOwner &&
    !isAssignedMechanic &&
    req.user.role === "mechanic" &&
    request.status === "Pending"
  ) {
    const mechanicProfile = await Mechanic.findOne({ user: req.user._id });
    isTargetMechanicBeforeAccept =
      !!mechanicProfile && mechanicProfile._id.toString() === request.mechanic.toString();
  }

  if (!isOwner && !isAssignedMechanic && !isTargetMechanicBeforeAccept) {
    res.status(403);
    throw new Error("Not authorized to cancel this request");
  }

  const allowedNext = VALID_TRANSITIONS[request.status] || [];
  if (!allowedNext.includes("Cancelled")) {
    res.status(400);
    throw new Error(`Cannot cancel a request with status "${request.status}"`);
  }

  request.status = "Cancelled";
  request.statusHistory.push({ status: "Cancelled", at: new Date() });
  await request.save();

  const notifyTarget = isOwner ? request.acceptedBy : request.user;
  if (notifyTarget) {
    await notify(notifyTarget, `The ${request.serviceType} request has been cancelled.`, request._id);
  }
  broadcastRequestUpdate(request);

  res.json({ success: true, request });
});

export {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
  acceptServiceRequest,
  updateServiceRequestStatus,
  cancelServiceRequest,
};