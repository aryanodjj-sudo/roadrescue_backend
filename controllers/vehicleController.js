import Vehicle from "../models/Vehicle.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  GET /api/vehicles
// @access Private
const getVehicles = asyncHandler(async (req, res) => {
  const vehicles = await Vehicle.find({ owner: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, vehicles });
});

// @route  POST /api/vehicles
// @access Private
const createVehicle = asyncHandler(async (req, res) => {
  const { make, model, year, type, plateNumber, isPrimary } = req.body;

  if (!make || !model || !year || !plateNumber) {
    res.status(400);
    throw new Error("make, model, year and plateNumber are required");
  }

  // If this is set as primary, un-set any other primary vehicle first
  if (isPrimary) {
    await Vehicle.updateMany(
      { owner: req.user._id },
      { $set: { isPrimary: false } }
    );
  }

  const vehicle = await Vehicle.create({
    owner: req.user._id,
    make,
    model,
    year,
    type,
    plateNumber,
    isPrimary: !!isPrimary,
  });

  res.status(201).json({ success: true, vehicle });
});

// @route  PUT /api/vehicles/:id
// @access Private
const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    res.status(404);
    throw new Error("Vehicle not found");
  }

  // Ownership check — a user can only ever modify their own vehicles
  if (vehicle.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to modify this vehicle");
  }

  const { make, model, year, type, plateNumber, isPrimary } = req.body;

  if (isPrimary) {
    await Vehicle.updateMany(
      { owner: req.user._id, _id: { $ne: vehicle._id } },
      { $set: { isPrimary: false } }
    );
  }

  if (make !== undefined) vehicle.make = make;
  if (model !== undefined) vehicle.model = model;
  if (year !== undefined) vehicle.year = year;
  if (type !== undefined) vehicle.type = type;
  if (plateNumber !== undefined) vehicle.plateNumber = plateNumber;
  if (isPrimary !== undefined) vehicle.isPrimary = isPrimary;

  const updated = await vehicle.save();
  res.json({ success: true, vehicle: updated });
});

// @route  DELETE /api/vehicles/:id
// @access Private
const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    res.status(404);
    throw new Error("Vehicle not found");
  }

  if (vehicle.owner.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this vehicle");
  }

  await vehicle.deleteOne();
  res.json({ success: true, message: "Vehicle removed" });
});

export { getVehicles, createVehicle, updateVehicle, deleteVehicle };
