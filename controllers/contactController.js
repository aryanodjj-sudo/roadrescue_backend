import ContactMessage from "../models/ContactMessage.js";
import asyncHandler from "../utils/asyncHandler.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_CATEGORIES = ["general", "partnership", "careers", "support"];

// In-memory per-IP cooldown so the public form can't be used to spam the
// database. Resets on server restart — fine for this scale; a persistent
// store would be overkill for a simple anti-spam guard.
const COOLDOWN_MS = 30 * 1000;
const lastSubmissionByIp = new Map();

// @route  POST /api/contact
// @access Public
// Body: { name, email, phone?, category?, subject?, message }
const createContactMessage = asyncHandler(async (req, res) => {
  const { name, email, phone, category, subject, message } = req.body;

  if (!name || !email || !message) {
    res.status(400);
    throw new Error("Name, email, and message are required");
  }
  if (!EMAIL_RE.test(email)) {
    res.status(400);
    throw new Error("Please provide a valid email address");
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    res.status(400);
    throw new Error("Invalid category");
  }

  const ip = req.ip;
  const last = lastSubmissionByIp.get(ip);
  if (last && Date.now() - last < COOLDOWN_MS) {
    res.status(429);
    throw new Error("Please wait a moment before sending another message");
  }

  const contactMessage = await ContactMessage.create({
    name,
    email,
    phone: phone || "",
    category: category || "general",
    subject: subject || "",
    message,
  });

  lastSubmissionByIp.set(ip, Date.now());

  res.status(201).json({
    success: true,
    message: "Thanks — we've received your message and will get back to you soon.",
    data: { id: contactMessage._id },
  });
});

export { createContactMessage };