import express from "express";
import {
  getMechanics,
  getNearbyMechanics,
  getMechanicById,
  getMyMechanicProfile,
  updateMechanicProfile,
  updateMechanicStatus,
} from "../controllers/mechanicController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

// IMPORTANT: static/specific paths must be registered before the
// dynamic "/:id" route, otherwise Express would try to treat
// "nearby" as an :id value.
router.get("/nearby", protect, getNearbyMechanics);
router.get("/me", protect, authorize("mechanic"), getMyMechanicProfile);
router.put("/profile", protect, authorize("mechanic"), updateMechanicProfile);
router.put("/status", protect, authorize("mechanic"), updateMechanicStatus);

router.get("/", protect, getMechanics);
router.get("/:id", protect, getMechanicById);

export default router;
