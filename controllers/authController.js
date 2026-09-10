import User from "../models/User.js";
import Mechanic from "../models/Mechanic.js";
import generateToken from "../utils/generateToken.js";
import asyncHandler from "../utils/asyncHandler.js";

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email and password are required");
  }

  const safeRole = role === "mechanic" ? "mechanic" : "user";

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const user = await User.create({ name, email, password, role: safeRole });

  if (safeRole === "mechanic") {
    await Mechanic.create({ user: user._id });
  }

  res.status(201).json({
    success: true,
    token: generateToken(user._id, user.role),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
    },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  if (user.status === "suspended") {
    res.status(403);
    throw new Error("This account has been suspended");
  }

  res.json({
    success: true,
    token: generateToken(user._id, user.role),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      role: user.role,
    },
  });
});

const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

export { register, login, getMe };