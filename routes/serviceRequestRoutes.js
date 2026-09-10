import express from "express";
import {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
  acceptServiceRequest,
  updateServiceRequestStatus,
  cancelServiceRequest,
} from "../controllers/serviceRequestController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect);

router
  .route("/")
  .get(getServiceRequests)
  .post(authorize("user"), createServiceRequest);

router.get("/:id", getServiceRequestById);
router.put("/:id/accept", authorize("mechanic"), acceptServiceRequest);
router.put("/:id/status", authorize("mechanic"), updateServiceRequestStatus);
router.put("/:id/cancel", authorize("user", "mechanic"), cancelServiceRequest);

export default router;
