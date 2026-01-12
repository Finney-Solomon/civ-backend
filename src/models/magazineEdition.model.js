const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const magazineEditionSchema = new Schema(
  {
    brand_id: { type: Schema.Types.ObjectId, ref: "MagazineBrand", required: true, index: true },
    year: { type: Number, required: true, min: 1900, max: 3000, index: true },
    month: { type: Number, required: true, min: 1, max: 12, index: true },
    language: { type: String, enum: ["en", "te", "ta", "hi"], required: true, index: true },

    publication_date: { type: Date, default: null },

    volume: { type: String, default: "" },
    edition_no: { type: String, default: "" },
    cover_title: { type: String, default: "" },

    masthead: {
      title_line: { type: String, default: "" },
      org_line: { type: String, default: "" },
      website_line: { type: String, default: "" },
      published_by_line: { type: String, default: "" },
    },

    cover_front_url: { type: String, default: "" },
    cover_back_url: { type: String, default: "" },
    pdf_url: { type: String, default: "" },

    template_id: { type: Schema.Types.ObjectId, ref: "MagazineTemplate", required: true },

    managed_by: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },
    author_id: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },

    status: { type: String, enum: ["draft", "in_review", "published", "archived"], default: "draft", index: true },
    published_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

magazineEditionSchema.index({ brand_id: 1, year: 1, month: 1, language: 1 }, { unique: true });

module.exports = getModel("MagazineEdition", magazineEditionSchema, "magazine_editions");
