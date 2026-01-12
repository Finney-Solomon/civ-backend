const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const slotDefaultsSchema = new Schema(
  {
    section_type: {
      type: String,
      enum: ["editorial", "story", "message", "testimony", "field_report", "devotional", "announcement", "prayer", "closing", "other"],
      default: "other",
    },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    summary: { type: String, default: "" },
    body: { type: String, default: "" },
    author_print_name: { type: String, default: "" },
    source_credit: { type: String, default: "" },
    ui_prompts: [{ type: String }],
  },
  { _id: false }
);

const templateSlotSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, required: true },
    required: { type: Boolean, default: true },
    rules: {
      allow_audio: { type: Boolean, default: true },
      allow_images: { type: Boolean, default: true },
      allow_verses: { type: Boolean, default: true },
      allow_lists: { type: Boolean, default: true },
      allow_highlights: { type: Boolean, default: true },
    },
    defaults: { type: slotDefaultsSchema, default: () => ({}) },
  },
  { _id: false }
);

const magazineTemplateSchema = new Schema(
  {
    brand_id: { type: Schema.Types.ObjectId, ref: "MagazineBrand", required: true, index: true },
    name: { type: String, required: true },
    language: { type: String, enum: ["en", "te", "ta", "hi", "multi"], default: "en" },
    slots: { type: [templateSlotSchema], default: [] },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

magazineTemplateSchema.index({ brand_id: 1, name: 1 }, { unique: true });

module.exports = getModel("MagazineTemplate", magazineTemplateSchema, "magazine_templates");
