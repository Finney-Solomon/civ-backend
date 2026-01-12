const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const authAccountSchema = new Schema(
  {
    email: { type: String, trim: true, lowercase: true, sparse: true, index: true },
    phone: { type: String, trim: true, sparse: true, index: true },
    password_hash: { type: String, required: true },

    is_email_verified: { type: Boolean, default: false },
    is_phone_verified: { type: Boolean, default: false },

    status: { type: String, enum: ["active", "blocked", "deleted"], default: "active" },
    last_login_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

authAccountSchema.index({ email: 1 }, { unique: true, sparse: true });
authAccountSchema.index({ phone: 1 }, { unique: true, sparse: true });

module.exports = getModel("AuthAccount", authAccountSchema, "auth_accounts");
