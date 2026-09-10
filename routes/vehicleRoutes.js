import express from "express";
import {
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from "../controllers/vehicleController.js";
import protect from "../middleware/authMiddleware.js";
import authorize from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect, authorize("user"));

router.route("/").get(getVehicles).post(createVehicle);
router.route("/:id").put(updateVehicle).delete(deleteVehicle);

export default router;
