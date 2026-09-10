import Notification from "../models/Notification.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  GET /api/notifications
// @access Private
const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({ success: true, notifications });
});

// @route  PUT /api/notifications/:id/read
// @access Private
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  notification.read = true;
  await notification.save();
  res.json({ success: true, notification });
});

// @route  PUT /api/notifications/read-all
// @access Private
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user._id, read: false },
    { $set: { read: true } }
  );
  res.json({ success: true });
});

export { getMyNotifications, markAsRead, markAllAsRead };