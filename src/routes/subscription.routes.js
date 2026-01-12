const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../middleware/auth');
const { Subscription, SubscriptionPlan } = require('../models');
const ApiResponse = require('../utils/apiResponse');

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { brandId } = req.query;
    const query = { user_id: req.user.userId };
    if (brandId) query.brand_id = brandId;

    const subscriptions = await Subscription.find(query)
      .populate('brand_id')
      .populate('plan_id')
      .lean();

    return ApiResponse.success(res, subscriptions);
  } catch (error) {
    next(error);
  }
});

router.get('/admin', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    const { brandId, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (brandId) query.brand_id = brandId;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate('user_id', 'display_name email phone')
        .populate('brand_id', 'name slug')
        .populate('plan_id', 'name price_inr')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Subscription.countDocuments(query),
    ]);

    return ApiResponse.success(res, {
      subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/grant', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    const { user_id, brand_id, plan_id, duration_months = 12 } = req.body;

    const plan = await SubscriptionPlan.findById(plan_id);
    if (!plan) {
      return ApiResponse.error(res, 'Plan not found', 404);
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration_months);

    const subscription = await Subscription.create({
      user_id,
      brand_id,
      plan_id,
      start_at: startDate,
      end_at: endDate,
      status: 'active',
    });

    return ApiResponse.success(res, subscription, 'Subscription granted successfully', 201);
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/subscriptions/admin/:id
router.put(
  "/admin/:id",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res, next) => {
    try {
      const { status, start_at, end_at, plan_id } = req.body;

      const update = {};
      if (status) update.status = status;
      if (start_at) update.start_at = new Date(start_at);
      if (end_at) update.end_at = new Date(end_at);
      if (plan_id) update.plan_id = plan_id;

      const doc = await Subscription.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true, runValidators: true }
      )
        .populate("user_id", "display_name email phone")
        .populate("brand_id", "name slug")
        .populate("plan_id", "name price_inr")
        .lean();

      if (!doc) return ApiResponse.notFound(res, "Subscription not found");
      return ApiResponse.success(res, doc, "Subscription updated");
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/subscriptions/admin/:id
router.delete(
  "/admin/:id",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res, next) => {
    try {
      const doc = await Subscription.findByIdAndDelete(req.params.id).lean();
      if (!doc) return ApiResponse.notFound(res, "Subscription not found");
      return ApiResponse.success(res, null, "Subscription deleted");
    } catch (error) {
      next(error);
    }
  }
);

//  list plans for dropdown
router.get(
  "/plans/admin",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  async (req, res, next) => {
    try {
      const { brandId, is_active } = req.query;
      const q = {};
      if (brandId) q.brand_id = brandId;
      if (is_active !== undefined) q.is_active = String(is_active) === "true";

      const plans = await SubscriptionPlan.find(q)
        .populate("brand_id", "name slug")
        .sort({ created_at: -1 })
        .lean();

      return ApiResponse.success(res, { plans });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/plans", authenticate, async (req, res, next) => {
  try {
    const { brandId } = req.query;
    if (!brandId) return ApiResponse.validationError(res, { brandId: "brandId is required" });

    const plans = await SubscriptionPlan.find({
      brand_id: brandId,
      is_active: true,
    })
      .sort({ price_inr: 1 })
      .lean();

    return ApiResponse.success(res, { plans });
  } catch (e) {
    next(e);
  }
});

// POST /api/v1/subscriptions/subscribe
// body: { brand_id, plan_id }
router.post("/subscribe", authenticate, async (req, res, next) => {
  try {
    const user_id = req.user.userId;
    const { brand_id, plan_id } = req.body;

    if (!brand_id || !plan_id) {
      return ApiResponse.validationError(res, {
        brand_id: "brand_id is required",
        plan_id: "plan_id is required",
      });
    }

    const plan = await SubscriptionPlan.findById(plan_id).lean();
    if (!plan) return ApiResponse.notFound(res, "Plan not found");

    // safety: plan must belong to same brand
    if (String(plan.brand_id) !== String(brand_id)) {
      return ApiResponse.error(res, "Plan does not belong to selected brand", 400);
    }

    // expire existing active subscription for same brand (optional but recommended)
    await Subscription.updateMany(
      { user_id, brand_id, status: "active" },
      { $set: { status: "expired" } }
    );

    const startDate = new Date();

    // duration: monthly/yearly based on plan.period
    const endDate = new Date(startDate);
    if (plan.period === "monthly") endDate.setMonth(endDate.getMonth() + 1);
    else endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await Subscription.create({
      user_id,
      brand_id,
      plan_id,
      start_at: startDate,
      end_at: endDate,
      status: "active",
      last_payment_id: null, // later set this after Razorpay success
    });

    const populated = await Subscription.findById(subscription._id)
      .populate("brand_id")
      .populate("plan_id")
      .lean();

    return ApiResponse.success(res, populated, "Subscription successful", 201);
  } catch (e) {
    next(e);
  }
});


module.exports = router;
