import ServiceRequest, { VALID_TRANSITIONS } from "../models/ServiceRequest.js";
import Vehicle from "../models/Vehicle.js";
import Mechanic from "../models/Mechanic.js";
import Notification from "../models/Notification.js";
import Payment from "../models/Payment.js";
import Review from "../models/Review.js";
import Coupon from "../models/Coupon.js";
import { getActiveSubscription } from "../utils/subscriptionStatus.js";
import asyncHandler from "../utils/asyncHandler.js";

async function notify(userId, message, serviceRequestId = null) {
  await Notification.create({ user: userId, message, serviceRequest: serviceRequestId });
}

function isValidPhone(phone) {
  return /^[0-9+\-\s()]{7,15}$/.test(phone || "");
}

// @route  POST /api/service-requests
// @access Private (user)
const createServiceRequest = asyncHandler(async (req, res) => {
  const {
    vehicleId,
    serviceType,
    description,
    mechanicId,
    customerLocation,
    bookingForSomeoneElse,
    recipientName,
    recipientPhone,
    manualAddress,
    couponCode,
  } = req.body;

  if (!vehicleId || !serviceType || !mechanicId) {
    res.status(400);
    throw new Error("vehicleId, serviceType and mechanicId are required");
  }

  if (bookingForSomeoneElse) {
    if (!recipientName?.trim()) {
      res.status(400);
      throw new Error("Recipient name is required when booking for someone else");
    }
    if (!isValidPhone(recipientPhone)) {
      res.status(400);
      throw new Error("A valid recipient phone number is required");
    }
    if (!manualAddress?.line?.trim()) {
      res.status(400);
      throw new Error("Address line is required when booking for someone else");
    }
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

  // --- Pricing: an active subscription (free) always takes priority over
  // a coupon. Recomputed here from scratch — never trust a client-sent
  // discount amount. ---
  const originalPrice = mechanic.pricePerVisit;
  let finalPrice = originalPrice;
  let discountAmount = 0;
  let viaSubscription = false;
  let appliedCouponCode = null;

  const activeSubscription = await getActiveSubscription(req.user._id);

  if (activeSubscription) {
    viaSubscription = true;
    discountAmount = originalPrice;
    finalPrice = 0;
  } else if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() });

    if (!coupon || !coupon.isActive) {
      res.status(400);
      throw new Error("Invalid or inactive coupon code");
    }
    if (coupon.expiryDate && coupon.expiryDate < new Date()) {
      res.status(400);
      throw new Error("This coupon has expired");
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      res.status(400);
      throw new Error("This coupon has reached its usage limit");
    }
    if (originalPrice < coupon.minOrderValue) {
      res.status(400);
      throw new Error(`This coupon requires a minimum order of ₹${coupon.minOrderValue}`);
    }

    let discount =
      coupon.discountType === "percentage"
        ? (originalPrice * coupon.discountValue) / 100
        : coupon.discountValue;
    if (coupon.discountType === "percentage" && coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
    discount = Math.min(discount, originalPrice);

    discountAmount = Math.round(discount);
    finalPrice = Math.max(0, originalPrice - discountAmount);
    appliedCouponCode = coupon.code;

    coupon.usedCount += 1;
    await coupon.save();
  }

  const request = await ServiceRequest.create({
    user: req.user._id,
    vehicle: vehicle._id,
    serviceType,
    description,
    mechanic: mechanic._id,
    customerLocation,
    pricePerVisit: finalPrice,
    originalPrice,
    discountAmount,
    couponCode: appliedCouponCode,
    viaSubscription,
    bookingForSomeoneElse: !!bookingForSomeoneElse,
    recipientName: bookingForSomeoneElse ? recipientName.trim() : null,
    recipientPhone: bookingForSomeoneElse ? recipientPhone.trim() : null,
    manualAddress: bookingForSomeoneElse
      ? {
          line: manualAddress.line.trim(),
          landmark: manualAddress.landmark?.trim() || null,
          city: manualAddress.city?.trim() || null,
          pincode: manualAddress.pincode?.trim() || null,
        }
      : null,
  });

  const notifyMessage = bookingForSomeoneElse
    ? `Request sent for ${recipientName} (${serviceType}). Waiting for a mechanic to accept.`
    : `Request sent for ${serviceType}. Waiting for a mechanic to accept.`;

  await notify(req.user._id, notifyMessage, request._id);

  const populated = await ServiceRequest.findById(request._id)
    .populate("vehicle")
    .populate("user", "name email phone")
    .populate({ path: "mechanic", populate: { path: "user", select: "name" } });

  res.status(201).json({ success: true, request: populated });
});

// @route  GET /api/service-requests
// @access Private
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
    await Payment.create({
      serviceRequest: request._id,
      user: request.user,
      serviceCharge: request.pricePerVisit,
      additionalCharges: 0,
      total: request.pricePerVisit,
    });
  }

  await request.save();

  await notify(request.user, `Your request status is now "${newStatus}".`, request._id);

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