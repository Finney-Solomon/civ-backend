const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const verseSchema = new Schema(
  {
    reference: { type: String, trim: true, default: "" },
    text: { type: String, default: "" },
    version: { type: String, default: "KJV" },
  },
  { _id: false }
);

const audioSegmentSchema = new Schema(
  {
    index: Number,
    text: String,
    duration_sec: Number,
  },
  { _id: false }
);

const audioSchema = new Schema(
  {
    url: { type: String, default: "" },
    key: { type: String, default: "" },
    mime_type: { type: String, default: "audio/mpeg" },
    size_bytes: { type: Number, default: 0 },

    duration_sec: { type: Number, default: 0 },
    bitrate: { type: Number, default: 0 },

    language: { type: String, default: "en-IN" },
    voice: { type: String, default: "default" },
    narrator: { type: String, default: "" },

    provider: {
      type: String,
      enum: ["google", "aws", "azure", "browser", "elevenlabs"],
      default: "google",
    },

    status: {
      type: String,
      enum: ["not_generated", "processing", "generated", "failed"],
      default: "not_generated",
    },

    content_hash: { type: String, default: "" },
    text_length: { type: Number, default: 0 },

    generated_at: { type: Date },
    last_requested_at: { type: Date },

    error_message: { type: String, default: "" },
    retry_count: { type: Number, default: 0 },

    is_cached: { type: Boolean, default: false },
    version: { type: Number, default: 1 },
    segments: { type: [audioSegmentSchema], default: [] },
    playback_speed: { type: Number, default: 1.0 },
  },
  { _id: false }
);

const slotDefaultsSchema = new Schema(
  {
    section_type: {
      type: String,
      enum: ["editorial", "story", "message", "testimony", "field_report", "devotional", "announcement", "prayer", "closing","reports","meetings","field_updates","other"],
      default: "other",
    },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    summary: { type: String, default: "" },
    body: { type: String, default: "" },
    author_print_name: { type: String, default: "" },
    source_credit: { type: String, default: "" },
    ui_prompts: [{ type: String }],
    bible_verses: { type: [verseSchema], default: [] },
    audio: { type: audioSchema, default: () => ({}) },
    content_order: [{ type: String, trim: true }],
    enabled_fields: [{ type: String, trim: true }],
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
