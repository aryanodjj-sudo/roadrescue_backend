import express from "express";
import {
  getPaymentByRequest,
  createOrder,
  verifyPayment,
} from "../controllers/paymentController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:requestId", protect, getPaymentByRequest);
router.post("/:requestId/create-order", protect, createOrder);
router.post("/:requestId/verify", protect, verifyPayment);

export default router;