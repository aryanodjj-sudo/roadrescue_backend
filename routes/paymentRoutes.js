import express from "express";
import { getPaymentByRequest } from "../controllers/paymentController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:requestId", protect, getPaymentByRequest);

export default router;