import express from "express";
import Service from "../models/Service.js";
import asyncHandler from "../utils/asyncHandler.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

// @route  GET /api/services
// @access Public — the service catalog (Breakdown, Towing, etc.) is shown
// on the public Services page before login.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const services = await Service.find({ isActive: true });
    res.json({ success: true, services });
  })
);

// @route  POST /api/services
// @access Private (admin) — lets an admin add/adjust catalog entries
router.post(
  "/",
  protect,
  authorize("admin"),
  asyncHandler(async (req, res) => {
    const service = await Service.create(req.body);
    res.status(201).json({ success: true, service });
  })
);

export default router;
