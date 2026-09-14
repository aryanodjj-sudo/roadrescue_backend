import Coupon from "../models/Coupon.js";
import asyncHandler from "../utils/asyncHandler.js";

// @route  POST /api/coupons/validate
// @access Private (user) — live preview before creating a service request.
// The actual discount is always recomputed server-side again when the
// request is created, so nothing here is ever trusted blindly.
const validateCoupon = asyncHandler(async (req, res) => {
  const { code, orderValue } = req.body;
  if (!code) {
    res.status(400);
    throw new Error("Coupon code is required");
  }

  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (!coupon || !coupon.isActive) {
    res.status(404);
    throw new Error("Invalid or inactive coupon code");
  }
  if (coupon.expiryDate && coupon.expiryDate < new Date()) {
    res.status(400);
    throw new Error("This coupon has expired");
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    res.status(400);
    throw new Error("This coupon has reached its usage limit");
  }

  const value = Number(orderValue) || 0;
  if (value < coupon.minOrderValue) {
    res.status(400);
    throw new Error(`This coupon requires a minimum order of ₹${coupon.minOrderValue}`);
  }

  let discount =
    coupon.discountType === "percentage" ? (value * coupon.discountValue) / 100 : coupon.discountValue;
  if (coupon.discountType === "percentage" && coupon.maxDiscount) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  discount = Math.min(discount, value);

  res.json({
    success: true,
    coupon: { code: coupon.code, discountType: coupon.discountType, discountValue: coupon.discountValue },
    discountAmount: Math.round(discount),
    finalAmount: Math.max(0, Math.round(value - discount)),
  });
});

// @route  POST /api/coupons
// @access Private (admin)
const createCoupon = asyncHandler(async (req, res) => {
  const { code, discountType, discountValue, maxDiscount, minOrderValue, expiryDate, usageLimit } = req.body;

  if (!code || !discountType || discountValue === undefined) {
    res.status(400);
    throw new Error("code, discountType and discountValue are required");
  }

  const exists = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (exists) {
    res.status(400);
    throw new Error("A coupon with this code already exists");
  }

  const coupon = await Coupon.create({
    code: code.toUpperCase().trim(),
    discountType,
    discountValue,
    maxDiscount: maxDiscount || null,
    minOrderValue: minOrderValue || 0,
    expiryDate: expiryDate || null,
    usageLimit: usageLimit || null,
  });

  res.status(201).json({ success: true, coupon });
});

// @route  GET /api/coupons
// @access Private (admin)
const getCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, coupons });
});

// @route  PUT /api/coupons/:id/toggle
// @access Private (admin)
const toggleCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }
  coupon.isActive = !coupon.isActive;
  await coupon.save();
  res.json({ success: true, coupon });
});

// @route  DELETE /api/coupons/:id
// @access Private (admin)
const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) {
    res.status(404);
    throw new Error("Coupon not found");
  }
  await coupon.deleteOne();
  res.json({ success: true });
});

export { validateCoupon, createCoupon, getCoupons, toggleCoupon, deleteCoupon };