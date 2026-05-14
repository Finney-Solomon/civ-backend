const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const verseSchema = new Schema(
  { reference: { type: String, trim: true, default: "" }, text: { type: String, default: "" }, version: { type: String, default: "KJV" } },
  { _id: false }
);

const imageSchema = new Schema(
  { url: { type: String, default: "" }, caption: { type: String, default: "" }, credit: { type: String, default: "" }, order: { type: Number, default: 0 } },
  { _id: false }
);

const audioSchema = new Schema(
  {
    // Core file info
    url: { type: String, default: "" }, // Public S3 URL
    key: { type: String, default: "" }, // S3 object key (important for delete/regenerate)
    mime_type: { type: String, default: "audio/mpeg" }, // mp3, wav, etc
    size_bytes: { type: Number, default: 0 },

    // Playback metadata
    duration_sec: { type: Number, default: 0 },
    bitrate: { type: Number, default: 0 },

    // Language & voice
    language: { type: String, default: "en-IN" }, // ta-IN, te-IN, hi-IN
    voice: { type: String, default: "default" }, // neural voice name
    narrator: { type: String, default: "" }, // optional display name

    // Provider info (important for switching later)
    provider: {
      type: String,
      enum: ["google", "aws", "azure", "browser", "elevenlabs"],
      default: "google",
    },

    // Status lifecycle (VERY IMPORTANT)
    status: {
      type: String,
      enum: ["not_generated", "processing", "generated", "failed"],
      default: "not_generated",
    },

    // Content tracking (for caching & cost control)
    content_hash: { type: String, default: "" }, // sha256 of text + language + voice
    text_length: { type: Number, default: 0 }, // characters used for billing

    // Timestamps
    generated_at: { type: Date },
    last_requested_at: { type: Date },

    // Error handling
    error_message: { type: String, default: "" },
    retry_count: { type: Number, default: 0 },

    // Control flags
    is_cached: { type: Boolean, default: false }, // reused audio
    version: { type: Number, default: 1 }, // for future upgrades

    // Optional advanced features
    segments: [
      {
        index: Number,
        text: String,
        duration_sec: Number,
      },
    ], // if you split audio into chunks

    playback_speed: { type: Number, default: 1.0 }, // future support
  },
  { _id: false }
);

const listSchema = new Schema(
  { title: { type: String, default: "" }, items: [{ type: String }] },
  { _id: false }
);

const highlightSchema = new Schema(
  { text: { type: String, default: "" }, emphasis: { type: String, enum: ["normal", "strong"], default: "normal" } },
  { _id: false }
);

const sectionContentSchema = new Schema(
  {
    section_type: {
      type: String,
      enum: ["editorial", "story", "message", "testimony", "field_report", "devotional", "announcement", "prayer", "closing", "reports", "meetings", "field_updates", "other"],
      required: true,
    },
    title: { type: String, trim: true, default: "" },
    subtitle: { type: String, trim: true, default: "" },
    author_print_name: { type: String, trim: true, default: "" },
    source_credit: { type: String, trim: true, default: "" },
    summary: { type: String, trim: true, default: "" },
    body: { type: String, default: "" },

    bible_verses: { type: [verseSchema], default: [] },
    highlights: { type: [highlightSchema], default: [] },
    lists: { type: [listSchema], default: [] },

    header_image: { type: imageSchema, default: () => ({}) },
    images: { type: [imageSchema], default: [] },

    audio: { type: audioSchema, default: () => ({}) },
    page_number: { type: Number, default: 0 },
  },
  { _id: false }
);

const magazineSectionSchema = new Schema(
  {
    edition_id: { type: Schema.Types.ObjectId, ref: "MagazineEdition", required: true, index: true },
    brand_id: { type: Schema.Types.ObjectId, ref: "MagazineBrand", required: true, index: true },

    slot_key: { type: String, required: true, index: true },
    slot_label: { type: String, default: "" },
    slot_order: { type: Number, required: true, index: true },

    content: { type: sectionContentSchema, required: true },

    status: { type: String, enum: ["empty", "draft", "in_review", "approved", "published"], default: "empty", index: true },

    created_by: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },

    review: {
      submitted_at: { type: Date, default: null },
      reviewed_by: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },
      reviewed_at: { type: Date, default: null },
      reviewer_notes: { type: String, default: "" },
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

magazineSectionSchema.index({ edition_id: 1, slot_key: 1 }, { unique: true });
magazineSectionSchema.index({ edition_id: 1, slot_order: 1 });

module.exports = getModel("MagazineSection", magazineSectionSchema, "magazine_sections");
