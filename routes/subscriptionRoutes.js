import express from "express";
import {
  getPlans,
  getMySubscription,
  subscribe,
  cancelSubscription,
  getAllSubscriptions,
} from "../controllers/subscriptionController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.get("/plans", protect, getPlans);
router.get("/me", protect, authorize("user"), getMySubscription);
router.post("/subscribe", protect, authorize("user"), subscribe);
router.put("/cancel", protect, authorize("user"), cancelSubscription);
router.get("/admin/all", protect, authorize("admin"), getAllSubscriptions);

export default router;