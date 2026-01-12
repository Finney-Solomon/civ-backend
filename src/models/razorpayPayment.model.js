const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const razorpayPaymentSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "AppUser", required: true, index: true },

    brand_id: { type: Schema.Types.ObjectId, ref: "MagazineBrand", required: true, index: true },
    plan_id: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },

    amount_paise: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    status: {
      type: String,
      enum: ["created", "attempted", "paid", "failed", "cancelled", "expired", "refunded"],
      default: "created",
      index: true,
    },

    razorpay: {
      order_id: { type: String, default: "", index: true },
      payment_id: { type: String, default: "", index: true },
      signature: { type: String, default: "" },

      refunds: [
        {
          refund_id: { type: String, default: "", index: true },
          amount_paise: { type: Number, default: 0 },
          status: { type: String, default: "" },
          created_at: { type: Date, default: null },
          notes: { type: String, default: "" },
        },
      ],

      webhook_events: [
        {
          event_id: { type: String, default: "" },
          event_type: { type: String, default: "" },
          received_at: { type: Date, default: Date.now },
        },
      ],
    },

    failure: {
      code: { type: String, default: "" },
      description: { type: String, default: "" },
      source: { type: String, default: "" },
      step: { type: String, default: "" },
      reason: { type: String, default: "" },
    },

    subscription_id: { type: Schema.Types.ObjectId, ref: "Subscription", default: null },
    notes: { type: Schema.Types.Mixed, default: {} },

    client: {
      platform: { type: String, enum: ["web", "android", "ios", "unknown"], default: "unknown" },
      device_id: { type: String, default: "" },
      ip: { type: String, default: "" },
      user_agent: { type: String, default: "" },
    },

    attempted_at: { type: Date, default: null },
    paid_at: { type: Date, default: null },
    failed_at: { type: Date, default: null },
    cancelled_at: { type: Date, default: null },
    refunded_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

razorpayPaymentSchema.index({ "razorpay.order_id": 1 }, { unique: true, sparse: true });
razorpayPaymentSchema.index({ "razorpay.payment_id": 1 }, { unique: true, sparse: true });
razorpayPaymentSchema.index({ user_id: 1, status: 1, created_at: -1 });
razorpayPaymentSchema.index({ brand_id: 1, status: 1, created_at: -1 });

module.exports = getModel("RazorpayPayment", razorpayPaymentSchema, "payments");
