import Subscription from "../models/Subscription.js";
import asyncHandler from "../utils/asyncHandler.js";

// Demo pricing — swap for a real payment gateway integration later.
export const PLANS = {
  monthly: { label: "Monthly", price: 299, durationDays: 30 },
  annual: { label: "Annual", price: 2999, durationDays: 365 },
};

// @route  GET /api/subscriptions/plans
// @access Private
const getPlans = asyncHandler(async (req, res) => {
  res.json({ success: true, plans: PLANS });
});

function withComputedStatus(sub) {
  const isActive = sub.status === "active" && new Date(sub.endDate) >= new Date();
  const daysRemaining = isActive
    ? Math.max(0, Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;
  return { ...sub.toObject(), isActive, daysRemaining };
}

// @route  GET /api/subscriptions/me
// @access Private (user)
const getMySubscription = asyncHandler(async (req, res) => {
  const latest = await Subscription.findOne({ user: req.user._id }).sort({ endDate: -1 });
  if (!latest) {
    return res.json({ success: true, subscription: null });
  }
  res.json({ success: true, subscription: withComputedStatus(latest) });
});

// @route  POST /api/subscriptions/subscribe
// @access Private (user)
// Body: { plan: "monthly" | "annual" }
// MOCK payment — no gateway integration, activates instantly.
const subscribe = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const planConfig = PLANS[plan];
  if (!planConfig) {
    res.status(400);
    throw new Error('plan must be "monthly" or "annual"');
  }

  const existing = await Subscription.findOne({
    user: req.user._id,
    status: "active",
    endDate: { $gte: new Date() },
  }).sort({ endDate: -1 });

  // Stack on top of an existing active subscription instead of wasting the
  // remaining time — new duration starts when the current one would end.
  const startDate = existing ? new Date(existing.endDate) : new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + planConfig.durationDays);

  if (existing) {
    existing.status = "expired";
    await existing.save();
  }

  const subscription = await Subscription.create({
    user: req.user._id,
    plan,
    price: planConfig.price,
    startDate,
    endDate,
    status: "active",
  });

  res.status(201).json({ success: true, subscription: withComputedStatus(subscription) });
});

// @route  PUT /api/subscriptions/cancel
// @access Private (user)
const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await Subscription.findOne({
    user: req.user._id,
    status: "active",
    endDate: { $gte: new Date() },
  }).sort({ endDate: -1 });

  if (!subscription) {
    res.status(404);
    throw new Error("No active subscription to cancel");
  }

  subscription.status = "cancelled";
  subscription.endDate = new Date();
  await subscription.save();

  res.json({ success: true, subscription: withComputedStatus(subscription) });
});

// @route  GET /api/subscriptions/admin/all
// @access Private (admin)
const getAllSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await Subscription.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 });
  res.json({ success: true, subscriptions });
});

export { getPlans, getMySubscription, subscribe, cancelSubscription, getAllSubscriptions };