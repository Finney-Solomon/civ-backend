const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const brandImageSchema = new Schema(
  {
    url: { type: String, required: true },
    label: { type: String, default: "" },
    order: { type: Number, default: 0 },
  },
  { _id: false }
);

const magazineBrandSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },

    publisher_name: { type: String, default: "" },
    website_url: { type: String, default: "" },
    published_by: { type: String, default: "" },

    supported_languages: { type: [String], enum: ["en", "te", "ta", "hi"], default: ["en"] },

    logo_url: { type: String, default: "" },
    banner_url: { type: String, default: "" },
    images: { type: [brandImageSchema], default: [] },

    default_template_id: { type: Schema.Types.ObjectId, ref: "MagazineTemplate", default: null },

    access_mode: { type: String, enum: ["subscribers_only", "public_preview"], default: "subscribers_only" },
    status: { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = getModel("MagazineBrand", magazineBrandSchema, "magazine_brands");
