import express from "express";
import { createComplaint, getMyComplaints } from "../controllers/complaintController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/", protect, authorize("user", "mechanic"), createComplaint);
router.get("/mine", protect, authorize("user", "mechanic"), getMyComplaints);

export default router;