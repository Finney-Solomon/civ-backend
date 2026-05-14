const { Meeting } = require("../models");

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const buildAdminQuery = (filters = {}) => {
  const { brand_id, status, from, to, search } = filters;
  const query = {};

  if (brand_id) query.brand_id = brand_id;
  if (status) query.status = status;
  if (from || to) {
    query.start_date = {};
    if (from) query.start_date.$gte = new Date(from);
    if (to) query.start_date.$lte = new Date(to);
  }
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { location_name: { $regex: search, $options: "i" } },
      { city: { $regex: search, $options: "i" } },
    ];
  }

  return query;
};

const createMeeting = async (data, userId = null) => {
  return Meeting.create({
    ...data,
    created_by: userId,
    updated_by: userId,
  });
};

const getMeetings = async (filters = {}) => {
  const page = toNumber(filters.page, 1);
  const limit = toNumber(filters.limit, 20);
  const query = buildAdminQuery(filters);
  const skip = (page - 1) * limit;

  const [meetings, total] = await Promise.all([
    Meeting.find(query)
      .populate("brand_id", "name slug status")
      .sort({ start_date: 1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Meeting.countDocuments(query),
  ]);

  return {
    meetings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getMeetingById = async (id) => {
  const meeting = await Meeting.findById(id)
    .populate("brand_id", "name slug status")
    .lean();

  if (!meeting) throw new Error("Meeting not found");
  return meeting;
};

const updateMeeting = async (id, data, userId = null) => {
  const meeting = await Meeting.findByIdAndUpdate(
    id,
    { $set: { ...data, updated_by: userId } },
    { new: true, runValidators: true }
  ).populate("brand_id", "name slug status");

  if (!meeting) throw new Error("Meeting not found");
  return meeting;
};

const archiveMeeting = async (id, userId = null) => {
  return updateMeeting(id, { status: "archived" }, userId);
};

const getMobileMeetings = async (filters = {}) => {
  const page = toNumber(filters.page, 1);
  const limit = toNumber(filters.limit, 20);
  const now = new Date();
  const query = {
    status: "active",
    end_date: { $gte: now },
  };

  if (filters.brand_id) query.brand_id = filters.brand_id;

  const skip = (page - 1) * limit;
  const [meetings, total] = await Promise.all([
    Meeting.find(query)
      .populate("brand_id", "name slug")
      .sort({ display_order: 1, start_date: 1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Meeting.countDocuments(query),
  ]);

  return {
    meetings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  archiveMeeting,
  createMeeting,
  getMeetingById,
  getMeetings,
  getMobileMeetings,
  updateMeeting,
};
