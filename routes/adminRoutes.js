import express from "express";
import {
  getUsers,
  getMechanics,
  verifyMechanic,
  getServiceRequests,
  getReports,
} from "../controllers/adminController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/users", getUsers);
router.get("/mechanics", getMechanics);
router.put("/mechanics/:id/verify", verifyMechanic);
router.get("/service-requests", getServiceRequests);
router.get("/reports", getReports);

export default router;
