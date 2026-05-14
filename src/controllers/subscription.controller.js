const { MagazineBrand, Subscription, SubscriptionPlan } = require("../models");
const ApiResponse = require("../utils/apiResponse");

const PLAN_PERIODS = ["monthly", "yearly"];
const PLAN_BRAND_FIELDS = "name slug logo_url banner_url";

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return value;
};

const buildPlanPayload = (body = {}, { partial = false } = {}) => {
  const payload = {};
  const errors = {};

  if (!partial || body.brand_id !== undefined) {
    if (!body.brand_id) errors.brand_id = "brand_id is required";
    else payload.brand_id = body.brand_id;
  }

  if (!partial || body.name !== undefined) {
    const name = String(body.name || "").trim();
    if (!name) errors.name = "name is required";
    else payload.name = name;
  }

  if (!partial || body.period !== undefined) {
    if (!PLAN_PERIODS.includes(body.period)) {
      errors.period = "period must be monthly or yearly";
    } else {
      payload.period = body.period;
    }
  }

  if (!partial || body.price_inr !== undefined) {
    const price = Number(body.price_inr);
    if (body.price_inr === "" || !Number.isFinite(price) || price <= 0) {
      errors.price_inr = "price_inr must be a positive number";
    } else {
      payload.price_inr = price;
    }
  }

  if (body.is_active !== undefined) {
    const isActive = parseBoolean(body.is_active);
    if (typeof isActive !== "boolean") {
      errors.is_active = "is_active must be a boolean";
    } else {
      payload.is_active = isActive;
    }
  }

  return { payload, errors };
};

const ensureBrandExists = async (brandId) => {
  const brand = await MagazineBrand.findById(brandId).select("_id").lean();
  return Boolean(brand);
};

const getMySubscriptions = async (req, res, next) => {
  try {
    const { brandId } = req.query;
    const query = { user_id: req.user.userId };
    if (brandId) query.brand_id = brandId;

    const subscriptions = await Subscription.find(query)
      .populate("brand_id")
      .populate("plan_id")
      .lean();

    return ApiResponse.success(res, subscriptions);
  } catch (error) {
    next(error);
  }
};

const getAdminSubscriptions = async (req, res, next) => {
  try {
    const { brandId, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (brandId) query.brand_id = brandId;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate("user_id", "display_name email phone")
        .populate("brand_id", "name slug")
        .populate("plan_id", "name price_inr")
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
};

const grantSubscription = async (req, res, next) => {
  try {
    const { user_id, brand_id, plan_id, duration_months = 12 } = req.body;

    const plan = await SubscriptionPlan.findById(plan_id);
    if (!plan) {
      return ApiResponse.error(res, "Plan not found", 404);
    }

    if (String(plan.brand_id) !== String(brand_id)) {
      return ApiResponse.error(res, "Plan does not belong to selected brand", 400);
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
      status: "active",
    });

    return ApiResponse.success(res, subscription, "Subscription granted successfully", 201);
  } catch (error) {
    next(error);
  }
};

const updateSubscription = async (req, res, next) => {
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
};

const deleteSubscription = async (req, res, next) => {
  try {
    const doc = await Subscription.findByIdAndDelete(req.params.id).lean();
    if (!doc) return ApiResponse.notFound(res, "Subscription not found");
    return ApiResponse.success(res, null, "Subscription deleted");
  } catch (error) {
    next(error);
  }
};

const listPlansAdmin = async (req, res, next) => {
  try {
    const { brandId, is_active, period } = req.query;
    const query = {};
    if (brandId) query.brand_id = brandId;
    if (is_active !== undefined) query.is_active = String(is_active) === "true";
    if (period) query.period = period;

    const plans = await SubscriptionPlan.find(query)
      .populate("brand_id", PLAN_BRAND_FIELDS)
      .sort({ created_at: -1 })
      .lean();

    return ApiResponse.success(res, { plans });
  } catch (error) {
    next(error);
  }
};

const createPlanAdmin = async (req, res, next) => {
  try {
    const { payload, errors } = buildPlanPayload(req.body);
    if (Object.keys(errors).length) return ApiResponse.validationError(res, errors);

    const brandExists = await ensureBrandExists(payload.brand_id);
    if (!brandExists) return ApiResponse.notFound(res, "Magazine brand not found");

    const plan = await SubscriptionPlan.create(payload);
    const populated = await SubscriptionPlan.findById(plan._id)
      .populate("brand_id", PLAN_BRAND_FIELDS)
      .lean();

    return ApiResponse.success(res, populated, "Subscription plan created", 201);
  } catch (error) {
    next(error);
  }
};

const getPlanAdmin = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id)
      .populate("brand_id", PLAN_BRAND_FIELDS)
      .lean();

    if (!plan) return ApiResponse.notFound(res, "Subscription plan not found");
    return ApiResponse.success(res, plan);
  } catch (error) {
    next(error);
  }
};

const updatePlanAdmin = async (req, res, next) => {
  try {
    const { payload, errors } = buildPlanPayload(req.body, { partial: true });
    if (Object.keys(errors).length) return ApiResponse.validationError(res, errors);
    if (!Object.keys(payload).length) {
      return ApiResponse.validationError(res, { plan: "At least one field is required" });
    }

    if (payload.brand_id) {
      const brandExists = await ensureBrandExists(payload.brand_id);
      if (!brandExists) return ApiResponse.notFound(res, "Magazine brand not found");
    }

    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { $set: payload },
      { new: true, runValidators: true }
    )
      .populate("brand_id", PLAN_BRAND_FIELDS)
      .lean();

    if (!plan) return ApiResponse.notFound(res, "Subscription plan not found");
    return ApiResponse.success(res, plan, "Subscription plan updated");
  } catch (error) {
    next(error);
  }
};

const deactivatePlanAdmin = async (req, res, next) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { $set: { is_active: false } },
      { new: true, runValidators: true }
    )
      .populate("brand_id", PLAN_BRAND_FIELDS)
      .lean();

    if (!plan) return ApiResponse.notFound(res, "Subscription plan not found");
    return ApiResponse.success(res, plan, "Subscription plan deactivated");
  } catch (error) {
    next(error);
  }
};

const listPlans = async (req, res, next) => {
  try {
    const { brandId } = req.query;
    if (!brandId) return ApiResponse.validationError(res, { brandId: "brandId is required" });

    const plans = await SubscriptionPlan.find({
      brand_id: brandId,
      is_active: true,
    })
      .populate("brand_id", PLAN_BRAND_FIELDS)
      .sort({ price_inr: 1 })
      .lean();

    return ApiResponse.success(res, { plans });
  } catch (error) {
    next(error);
  }
};

const subscribe = async (req, res, next) => {
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

    if (String(plan.brand_id) !== String(brand_id)) {
      return ApiResponse.error(res, "Plan does not belong to selected brand", 400);
    }

    await Subscription.updateMany(
      { user_id, brand_id, status: "active" },
      { $set: { status: "expired" } }
    );

    const startDate = new Date();
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
      last_payment_id: null,
    });

    const populated = await Subscription.findById(subscription._id)
      .populate("brand_id")
      .populate("plan_id")
      .lean();

    return ApiResponse.success(res, populated, "Subscription successful", 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMySubscriptions,
  getAdminSubscriptions,
  grantSubscription,
  updateSubscription,
  deleteSubscription,
  listPlansAdmin,
  createPlanAdmin,
  getPlanAdmin,
  updatePlanAdmin,
  deactivatePlanAdmin,
  listPlans,
  subscribe,
};
