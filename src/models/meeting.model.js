const mongoose = require("mongoose");
const { Schema } = mongoose;
const getModel = require("./_getModel");

const preacherSchema = new Schema(
  {
    name: { type: String, trim: true, required: true },
    title: { type: String, trim: true, default: "" },
    bio: { type: String, default: "" },
    image_url: { type: String, default: "" },
  },
  { _id: false }
);

const meetingScheduleSchema = new Schema(
  {
    date: { type: Date, required: true },
    start_time: { type: String, trim: true, default: "" },
    end_time: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    preacher_name: { type: String, trim: true, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const meetingSchema = new Schema(
  {
    brand_id: { type: Schema.Types.ObjectId, ref: "MagazineBrand", default: null, index: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },

    start_date: { type: Date, required: true, index: true },
    end_date: { type: Date, required: true, index: true },
    timezone: { type: String, trim: true, default: "Asia/Kolkata" },

    location_name: { type: String, trim: true, default: "" },
    address: { type: String, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    map_url: { type: String, default: "" },

    preachers: { type: [preacherSchema], default: [] },
    schedule: { type: [meetingScheduleSchema], default: [] },

    contact_name: { type: String, trim: true, default: "" },
    contact_phone: { type: String, trim: true, default: "" },
    contact_email: { type: String, trim: true, default: "" },
    registration_url: { type: String, default: "" },
    banner_url: { type: String, default: "" },

    display_order: { type: Number, default: 0, index: true },
    status: { type: String, enum: ["active", "inactive", "archived"], default: "active", index: true },
    created_by: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: "AppUser", default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

meetingSchema.index({ brand_id: 1, status: 1, display_order: 1, start_date: 1 });

module.exports = getModel("Meeting", meetingSchema, "meetings");
