import express from "express";
import {
  validateCoupon,
  createCoupon,
  getCoupons,
  toggleCoupon,
  deleteCoupon,
} from "../controllers/couponController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/validate", protect, authorize("user"), validateCoupon);

router.get("/", protect, authorize("admin"), getCoupons);
router.post("/", protect, authorize("admin"), createCoupon);
router.put("/:id/toggle", protect, authorize("admin"), toggleCoupon);
router.delete("/:id", protect, authorize("admin"), deleteCoupon);

export default router;