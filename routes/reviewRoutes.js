import express from "express";
import {
  createReview,
  getMechanicReviews,
} from "../controllers/reviewController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("user"), createReview);
router.get("/mechanic/:id", getMechanicReviews);

export default router;
