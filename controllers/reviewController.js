import Review from "../models/Review.js";
import ServiceRequest from "../models/ServiceRequest.js";
import Mechanic from "../models/Mechanic.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  POST /api/reviews
// @access Private (user)
// Body: { serviceRequestId, rating, comment }
const createReview = asyncHandler(async (req, res) => {
  const { serviceRequestId, rating, comment } = req.body;

  if (!serviceRequestId || !rating) {
    res.status(400);
    throw new Error("serviceRequestId and rating are required");
  }

  const request = await ServiceRequest.findById(serviceRequestId);
  if (!request) {
    res.status(404);
    throw new Error("Service request not found");
  }

  if (request.user.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to review this request");
  }

  if (request.status !== "Completed") {
    res.status(400);
    throw new Error("Reviews can only be left after the service is completed");
  }

  const existing = await Review.findOne({ serviceRequest: request._id });
  if (existing) {
    res.status(400);
    throw new Error("This request has already been reviewed");
  }

  const review = await Review.create({
    serviceRequest: request._id,
    user: req.user._id,
    mechanic: request.mechanic,
    rating,
    comment,
  });

  // Recalculate mechanic's aggregate rating
  const stats = await Review.aggregate([
    { $match: { mechanic: request.mechanic } },
    {
      $group: {
        _id: "$mechanic",
        avgRating: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await Mechanic.findByIdAndUpdate(request.mechanic, {
      rating: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].count,
    });
  }

  res.status(201).json({ success: true, review });
});

// @route  GET /api/reviews/mechanic/:id
// @access Public
const getMechanicReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ mechanic: req.params.id })
    .populate("user", "name")
    .sort({ createdAt: -1 });

  res.json({ success: true, reviews });
});

export { createReview, getMechanicReviews };
