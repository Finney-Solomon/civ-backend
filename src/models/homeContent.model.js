const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const homeContentSchema = new Schema(
  {
    brand_id: { type: Schema.Types.ObjectId, ref: "MagazineBrand", default: null, index: true },
    type: { type: String, enum: ["bible_verse", "quote"], required: true, index: true },
    language: { type: String, enum: ["en", "te", "ta", "hi"], default: "en", index: true },

    title: { type: String, trim: true, default: "" },
    text: { type: String, required: true },
    reference: { type: String, trim: true, default: "" },
    version: { type: String, trim: true, default: "" },
    author: { type: String, trim: true, default: "" },
    image_url: { type: String, default: "" },

    display_order: { type: Number, default: 0, index: true },
    starts_at: { type: Date, default: null },
    ends_at: { type: Date, default: null },

    status: { type: String, enum: ["active", "inactive", "archived"], default: "active", index: true },
    created_by: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

homeContentSchema.index({ brand_id: 1, type: 1, language: 1, status: 1, display_order: 1 });

module.exports = getModel("HomeContent", homeContentSchema, "home_contents");
