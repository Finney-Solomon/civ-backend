const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const userSessionSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "AppUser", required: true, index: true },
    refresh_token_hash: { type: String, required: true },

    device_id: { type: String, default: "" },
    device_name: { type: String, default: "" },
    platform: { type: String, enum: ["ios", "android", "web", "unknown"], default: "unknown" },

    ip: { type: String, default: "" },
    user_agent: { type: String, default: "" },

    expires_at: { type: Date, required: true, index: true },
    revoked_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

userSessionSchema.index({ user_id: 1, expires_at: -1 });

module.exports = getModel("UserSession", userSessionSchema, "user_sessions");
