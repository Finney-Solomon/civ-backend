const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const addressSchema = new Schema(
  {
    full_name: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    line1: { type: String, trim: true, default: "" },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "India" },
    zip_code: { type: String, trim: true, default: "" },
    landmark: { type: String, trim: true, default: "" },
    is_default: { type: Boolean, default: false },
  },
  { _id: true }
);

const roleSchema = new Schema(
  {
    role: { type: String, enum: ["SUPER_ADMIN", "ADMIN", "AUTHOR", "USER"], required: true },
    brand_ids: [{ type: Schema.Types.ObjectId, ref: "MagazineBrand" }],
  },
  { _id: false }
);

const appUserSchema = new Schema(
  {
    account_id: { type: Schema.Types.ObjectId, ref: "AuthAccount", required: true, unique: true },

    display_name: { type: String, trim: true, default: "" },
    first_name: { type: String, trim: true, default: "" },
    last_name: { type: String, trim: true, default: "" },

    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },

    addresses: { type: [addressSchema], default: [] },

    roles: { type: [roleSchema], default: [{ role: "USER", brand_ids: [] }] },

    profile_photo_url: { type: String, default: "" },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

appUserSchema.index({ "roles.role": 1 });
appUserSchema.index({ "roles.brand_ids": 1 });

module.exports = getModel("AppUser", appUserSchema, "app_users");
