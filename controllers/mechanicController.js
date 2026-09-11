import Mechanic from "../models/Mechanic.js";
import { calculateDistance, estimateETA } from "../utils/calculateDistance.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  GET /api/mechanics
// @access Private
// Optional query params: service, minRating
const getMechanics = asyncHandler(async (req, res) => {
  const { service, minRating } = req.query;

  const filter = {
    "verification.status": "Approved",
    isOnline: true,
  };
  if (service) filter.services = service;
  if (minRating) filter.rating = { $gte: Number(minRating) };

  const mechanics = await Mechanic.find(filter).populate(
    "user",
    "name email phone"
  );

  res.json({ success: true, mechanics });
});

// @route  GET /api/mechanics/nearby
// @access Private
// Query params: lat, lng (required), service, minRating, maxDistanceKm, sortBy
const getNearbyMechanics = asyncHandler(async (req, res) => {
  const { lat, lng, service, minRating, maxDistanceKm, sortBy } = req.query;

  if (!lat || !lng) {
    res.status(400);
    throw new Error("lat and lng query parameters are required");
  }

  const filter = {
    "verification.status": "Approved",
    isOnline: true,
    "location.lat": { $ne: null },
    "location.lng": { $ne: null },
  };
  if (service) filter.services = service;
  if (minRating) filter.rating = { $gte: Number(minRating) };

  const mechanics = await Mechanic.find(filter).populate(
    "user",
    "name email phone"
  );

  let results = mechanics.map((m) => {
    const distanceKm = calculateDistance(
      Number(lat),
      Number(lng),
      m.location.lat,
      m.location.lng
    );
    return {
      id: m._id,
      name: m.user?.name,
      rating: m.rating,
      reviewCount: m.reviewCount,
      services: m.services,
      pricePerVisit: m.pricePerVisit,
      verified: m.verification.status === "Approved",
      distanceKm,
      etaMinutes: estimateETA(distanceKm),
    };
  });

  if (maxDistanceKm) {
    results = results.filter((m) => m.distanceKm <= Number(maxDistanceKm));
  }

  const sortKey = sortBy || "distance";
  results.sort((a, b) => {
    if (sortKey === "rating") return b.rating - a.rating;
    if (sortKey === "price") return a.pricePerVisit - b.pricePerVisit;
    return a.distanceKm - b.distanceKm;
  });

  res.json({ success: true, mechanics: results });
});

// @route  GET /api/mechanics/me
// @access Private (mechanic only)
// Returns the logged-in mechanic's own profile. Needed because the client
// only ever has the User id from auth, never the Mechanic profile id.
const getMyMechanicProfile = asyncHandler(async (req, res) => {
  const mechanic = await Mechanic.findOne({ user: req.user._id }).populate(
    "user",
    "name email phone"
  );

  if (!mechanic) {
    res.status(404);
    throw new Error("Mechanic profile not found for this account");
  }

  res.json({ success: true, mechanic });
});

// @route  GET /api/mechanics/:id
// @access Private
const getMechanicById = asyncHandler(async (req, res) => {
  const mechanic = await Mechanic.findById(req.params.id).populate(
    "user",
    "name email phone"
  );

  if (!mechanic) {
    res.status(404);
    throw new Error("Mechanic not found");
  }

  res.json({ success: true, mechanic });
});

// @route  PUT /api/mechanics/profile
// @access Private (mechanic only)
const updateMechanicProfile = asyncHandler(async (req, res) => {
  const mechanic = await Mechanic.findOne({ user: req.user._id });

  if (!mechanic) {
    res.status(404);
    throw new Error("Mechanic profile not found for this account");
  }

  const {
    services,
    pricePerVisit,
    experienceYears,
    serviceArea,
    bio,
    location,
  } = req.body;

  if (services !== undefined) mechanic.services = services;
  if (pricePerVisit !== undefined) mechanic.pricePerVisit = pricePerVisit;
  if (experienceYears !== undefined)
    mechanic.experienceYears = experienceYears;
  if (serviceArea !== undefined) mechanic.serviceArea = serviceArea;
  if (bio !== undefined) mechanic.bio = bio;
  if (location?.lat !== undefined && location?.lng !== undefined) {
    mechanic.location = { lat: location.lat, lng: location.lng };
  }

  const updated = await mechanic.save();
  res.json({ success: true, mechanic: updated });
});

// @route  PUT /api/mechanics/status
// @access Private (mechanic only)
// Body: { isOnline: boolean, location?: { lat, lng } }
// Accepting location here (in addition to /profile) lets the frontend send
// a fresh GPS fix in the same request as "go online" — /mechanics/nearby
// filters out mechanics with no location set, so without this a mechanic
// could be online + approved and still never show up in a user's search.
const updateMechanicStatus = asyncHandler(async (req, res) => {
  const mechanic = await Mechanic.findOne({ user: req.user._id });

  if (!mechanic) {
    res.status(404);
    throw new Error("Mechanic profile not found for this account");
  }

  if (mechanic.verification.status !== "Approved") {
    res.status(403);
    throw new Error("Your account must be verified before going online");
  }

  mechanic.isOnline = !!req.body.isOnline;

  const { location } = req.body;
  if (location?.lat !== undefined && location?.lng !== undefined) {
    mechanic.location = { lat: location.lat, lng: location.lng };
  }

  const updated = await mechanic.save();

  res.json({
    success: true,
    isOnline: updated.isOnline,
    location: updated.location,
  });
});

export {
  getMechanics,
  getNearbyMechanics,
  getMechanicById,
  getMyMechanicProfile,
  updateMechanicProfile,
  updateMechanicStatus,
};