const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const subscriptionPlanSchema = new Schema(
  {
    brand_id: { type: Schema.Types.ObjectId, ref: "MagazineBrand", required: true, index: true },
    name: { type: String, required: true, trim: true },
    period: { type: String, enum: ["monthly", "yearly"], default: "yearly" },
    price_inr: { type: Number, required: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

subscriptionPlanSchema.index({ brand_id: 1, period: 1, is_active: 1 });

module.exports = getModel("SubscriptionPlan", subscriptionPlanSchema, "subscription_plans");
