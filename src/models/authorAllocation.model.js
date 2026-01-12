const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const authorAllocationSchema = new Schema(
  {
    brand_id: { type: Schema.Types.ObjectId, ref: "MagazineBrand", required: true, index: true },
    edition_id: { type: Schema.Types.ObjectId, ref: "MagazineEdition", required: true, index: true },

    author_id: { type: Schema.Types.ObjectId, ref: "AppUser", required: true, index: true },
    assigned_by: { type: Schema.Types.ObjectId, ref: "AppUser", required: true },

    status: { type: String, enum: ["active", "revoked"], default: "active" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

authorAllocationSchema.index({ edition_id: 1, author_id: 1 }, { unique: true });

module.exports = getModel("AuthorAllocation", authorAllocationSchema, "author_allocations");
