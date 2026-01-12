// src/models/authorProfile.model.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const authorProfileSchema = new Schema(
  {
    // 🔗 linked auth user
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "AppUser",
      required: true,
      unique: true,
      index: true,
    },

    /* -------------------- IDENTITY -------------------- */
    first_name: { type: String, trim: true, required: true },
    last_name: { type: String, trim: true, default: "" },

    // name shown in magazine / app
    display_name: { type: String, trim: true, index: true },

    bio: { type: String, trim: true, default: "" },
    profile_photo_url: { type: String, default: "" },

    /* -------------------- CONTACT -------------------- */
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },

    phone: {
      country_code: { type: String, default: "+91" },
      number: { type: String, trim: true },
    },

    /* -------------------- LOCATION -------------------- */
    location: {
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      country: { type: String, default: "India" },
      address_line: { type: String, default: "" },
      pincode: { type: String, default: "" },
    },

    /* -------------------- AUTHOR METADATA -------------------- */
    designation: {
      type: String,
      default: "", // e.g. Evangelist, Pastor, Contributor, Editor
    },

    experience_years: {
      type: Number,
      default: 0,
    },

    ministry_affiliation: {
      type: String,
      default: "",
    },

    /* -------------------- ACCESS & PERMISSIONS -------------------- */
    brand_ids: [
      { type: Schema.Types.ObjectId, ref: "MagazineBrand", index: true },
    ],

    languages: {
      type: [String],
      enum: ["en", "te", "ta", "hi"],
      default: ["en"],
    },

    role: {
      type: String,
      enum: ["author", "editor", "translator"],
      default: "author",
      index: true,
    },

    /* -------------------- SOCIALS -------------------- */
    socials: {
      website: { type: String, default: "" },
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },

    /* -------------------- STATUS & CONTROL -------------------- */
    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
      index: true,
    },

    is_verified: {
      type: Boolean,
      default: false,
    },

    is_public: {
      type: Boolean,
      default: true, // visible in magazine/app
    },

    /* -------------------- AUDIT -------------------- */
    created_by: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

/* -------------------- INDEXES -------------------- */
authorProfileSchema.index({ brand_ids: 1, status: 1 });
authorProfileSchema.index({ display_name: 1 });

module.exports = mongoose.model(
  "AuthorProfile",
  authorProfileSchema,
  "author_profiles"
);
