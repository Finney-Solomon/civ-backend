const Razorpay = require("razorpay");
const crypto = require("crypto");
const config = require("../config");
const { RazorpayPayment, Subscription, SubscriptionPlan } = require("../models");

// Global Configuration
const keyId = config?.razorpay?.keyId;
const keySecret = config?.razorpay?.keySecret;
const isConfigured = Boolean(keyId && keySecret);
const razorpay = isConfigured
  ? new Razorpay({ key_id: keyId, key_secret: keySecret })
  : null;

const addPlanDuration = (date, period) => {
  const endDate = new Date(date);
  if (period === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
  else endDate.setMonth(endDate.getMonth() + 1);
  return endDate;
};

/**
 * Throw error if Razorpay credentials are missing
 */
const assertConfigured = () => {
  if (!isConfigured || !razorpay) {
    const err = new Error(
      "Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env / Vercel env."
    );
    err.statusCode = 500;
    throw err;
  }
};

/**
 * Handle new subscription logic (Yearly/Monthly)
 */
const activateSubscription = async (payment) => {
  const plan = await SubscriptionPlan.findById(payment.plan_id);
  if (!plan) {
    const err = new Error("Subscription plan not found");
    err.statusCode = 404;
    throw err;
  }

  const existingSubscription = await Subscription.findOne({
    user_id: payment.user_id,
    brand_id: payment.brand_id,
    status: "active",
  });

  let subscription;

  if (existingSubscription) {
    const now = new Date();
    const currentEndDate = existingSubscription.end_at > now ? existingSubscription.end_at : now;

    existingSubscription.end_at = addPlanDuration(currentEndDate, plan.period);
    existingSubscription.plan_id = plan._id;
    existingSubscription.last_payment_id = payment._id;
    await existingSubscription.save();

    subscription = existingSubscription;
  } else {
    const startDate = new Date();
    const endDate = addPlanDuration(startDate, plan.period);

    subscription = await Subscription.create({
      user_id: payment.user_id,
      brand_id: payment.brand_id,
      plan_id: plan._id,
      start_at: startDate,
      end_at: endDate,
      status: "active",
      last_payment_id: payment._id,
    });
  }

  return subscription;
};

/**
 * Create a new Payment Session and Razorpay Order
 */
const createOrder = async (userId, planId, clientInfo = {}) => {
  assertConfigured();

  const plan = await SubscriptionPlan.findById(planId);

  if (!plan || !plan.is_active) {
    const err = new Error("Invalid or inactive subscription plan");
    err.statusCode = 400;
    throw err;
  }

  const amountPaise = plan.price_inr * 100;

  const orderOptions = {
    amount: amountPaise,
    currency: "INR",
    receipt: `rcpt_${Date.now()}_${userId}`,
    notes: {
      user_id: userId.toString(),
      plan_id: planId.toString(),
      brand_id: plan.brand_id.toString(),
    },
  };

  const razorpayOrder = await razorpay.orders.create(orderOptions);

  const payment = await RazorpayPayment.create({
    user_id: userId,
    brand_id: plan.brand_id,
    plan_id: planId,
    amount_paise: amountPaise,
    currency: "INR",
    status: "created",
    razorpay: { order_id: razorpayOrder.id },
    client: {
      platform: clientInfo.platform || "unknown",
      device_id: clientInfo.device_id || "",
      ip: clientInfo.ip || "",
      user_agent: clientInfo.user_agent || "",
    },
  });

  return {
    payment_id: payment._id,
    razorpay_order_id: razorpayOrder.id,
    amount: plan.price_inr,
    currency: "INR",
    plan_name: plan.name,
  };
};

/**
 * Verify RSA signature and finalize subscription
 */
const verifyPayment = async (paymentData) => {
  assertConfigured();

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

  const generated_signature = crypto
    .createHmac("sha256", config.razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated_signature !== razorpay_signature) {
    const err = new Error("Invalid payment signature");
    err.statusCode = 400;
    throw err;
  }

  const payment = await RazorpayPayment.findOne({ "razorpay.order_id": razorpay_order_id });
  if (!payment) {
    const err = new Error("Payment record not found");
    err.statusCode = 404;
    throw err;
  }

  if (payment.status === "paid") {
    return {
      payment,
      subscription: await Subscription.findById(payment.subscription_id),
      alreadyProcessed: true,
    };
  }

  payment.status = "paid";
  payment.razorpay.payment_id = razorpay_payment_id;
  payment.razorpay.signature = razorpay_signature;
  payment.paid_at = new Date();
  await payment.save();

  const subscription = await activateSubscription(payment);

  payment.subscription_id = subscription._id;
  await payment.save();

  return { payment, subscription, alreadyProcessed: false };
};

/**
 * Process Razorpay Webhook Event
 */
const handleWebhook = async (event) => {
  const eventId = event.id;

  const existingEvent = await RazorpayPayment.findOne({
    "razorpay.webhook_events.event_id": eventId,
  });
  if (existingEvent) return { processed: false, reason: "duplicate_event" };

  const eventType = event.event;
  const payload = event.payload;

  let payment;

  if (eventType === "payment.captured" || eventType === "order.paid") {
    const orderId = payload.payment?.entity?.order_id || payload.order?.entity?.id;

    if (orderId) {
      payment = await RazorpayPayment.findOne({ "razorpay.order_id": orderId });

      if (payment) {
        payment.razorpay.webhook_events.push({
          event_id: eventId,
          event_type: eventType,
          received_at: new Date(),
        });

        if (payment.status === "created" || payment.status === "attempted") {
          payment.status = "paid";
          payment.paid_at = new Date();
          payment.razorpay.payment_id = payload.payment?.entity?.id || "";

          await payment.save();

          if (!payment.subscription_id) {
            const subscription = await activateSubscription(payment);
            payment.subscription_id = subscription._id;
            await payment.save();
          }
        } else {
          await payment.save();
        }
      }
    }
  } else if (eventType === "payment.failed") {
    const orderId = payload.payment?.entity?.order_id;

    if (orderId) {
      payment = await RazorpayPayment.findOne({ "razorpay.order_id": orderId });

      if (payment) {
        payment.status = "failed";
        payment.failed_at = new Date();
        payment.failure = {
          code: payload.payment?.entity?.error_code || "",
          description: payload.payment?.entity?.error_description || "",
          source: payload.payment?.entity?.error_source || "",
          step: payload.payment?.entity?.error_step || "",
          reason: payload.payment?.entity?.error_reason || "",
        };

        payment.razorpay.webhook_events.push({
          event_id: eventId,
          event_type: eventType,
          received_at: new Date(),
        });

        await payment.save();
      }
    }
  } else if (eventType.startsWith("refund.")) {
    const paymentId = payload.refund?.entity?.payment_id;

    if (paymentId) {
      payment = await RazorpayPayment.findOne({ "razorpay.payment_id": paymentId });

      if (payment) {
        payment.razorpay.refunds.push({
          refund_id: payload.refund?.entity?.id || "",
          amount_paise: payload.refund?.entity?.amount || 0,
          status: payload.refund?.entity?.status || "",
          created_at: new Date(payload.refund?.entity?.created_at * 1000),
          notes: "",
        });

        if (eventType === "refund.processed") {
          payment.status = "refunded";
          payment.refunded_at = new Date();
        }

        payment.razorpay.webhook_events.push({
          event_id: eventId,
          event_type: eventType,
          received_at: new Date(),
        });

        await payment.save();
      }
    }
  }

  return { processed: true, payment };
};

/**
 * Validates webhook packet authenticity
 */
const verifyWebhookSignature = (body, signature) => {
  if (!config?.razorpay?.webhookSecret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", config.razorpay.webhookSecret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  verifyWebhookSignature,
  activateSubscription,
};
