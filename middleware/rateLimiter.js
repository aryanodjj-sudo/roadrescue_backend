import rateLimit from "express-rate-limit";

// Applies to login/register/OTP-style auth endpoints — the most common
// target for brute-force and credential-stuffing attempts.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts from this device. Please try again in 15 minutes.",
  },
});

// Looser limit for general public write endpoints (contact form, etc.)
// where a cooldown already exists per-field but a blanket IP cap adds
// defense in depth.
export const publicWriteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this device. Please try again later.",
  },
});