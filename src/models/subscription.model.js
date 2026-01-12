const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const subscriptionSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "AppUser", required: true, index: true },
    brand_id: { type: Schema.Types.ObjectId, ref: "MagazineBrand", required: true, index: true },
    plan_id: { type: Schema.Types.ObjectId, ref: "SubscriptionPlan", required: true },

    start_at: { type: Date, required: true },
    end_at: { type: Date, required: true },

    status: { type: String, enum: ["active", "expired", "cancelled"], default: "active", index: true },
    last_payment_id: { type: Schema.Types.ObjectId, ref: "RazorpayPayment", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

subscriptionSchema.index({ user_id: 1, brand_id: 1, status: 1 });

module.exports = getModel("Subscription", subscriptionSchema, "subscriptions");
