import express from "express";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/", getMyNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);

export default router;