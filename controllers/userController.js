import User from "../models/User.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  GET /api/users/profile
// @access Private
const getProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      address: req.user.address,
      role: req.user.role,
    },
  });
});

// @route  PUT /api/users/profile
// @access Private
const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, address } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;
  // Email is intentionally NOT editable here — matches frontend Profile.jsx
  // where the email field is disabled.

  const updated = await user.save();

  res.json({
    success: true,
    user: {
      id: updated._id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: updated.address,
      role: updated.role,
    },
  });
});

export { getProfile, updateProfile };