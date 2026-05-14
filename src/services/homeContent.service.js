const { HomeContent } = require("../models");

const toNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const buildAdminQuery = (filters = {}) => {
  const { brand_id, type, language, status, search } = filters;
  const query = {};

  if (brand_id) query.brand_id = brand_id;
  if (type) query.type = type;
  if (language) query.language = language;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { text: { $regex: search, $options: "i" } },
      { reference: { $regex: search, $options: "i" } },
      { author: { $regex: search, $options: "i" } },
    ];
  }

  return query;
};

const createHomeContent = async (data, userId = null) => {
  return HomeContent.create({
    ...data,
    created_by: userId,
    updated_by: userId,
  });
};

const getHomeContents = async (filters = {}) => {
  const page = toNumber(filters.page, 1);
  const limit = toNumber(filters.limit, 20);
  const query = buildAdminQuery(filters);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    HomeContent.find(query)
      .populate("brand_id", "name slug status")
      .sort({ display_order: 1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    HomeContent.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const getHomeContentById = async (id) => {
  const item = await HomeContent.findById(id)
    .populate("brand_id", "name slug status")
    .lean();

  if (!item) throw new Error("Home content not found");
  return item;
};

const updateHomeContent = async (id, data, userId = null) => {
  const item = await HomeContent.findByIdAndUpdate(
    id,
    { $set: { ...data, updated_by: userId } },
    { new: true, runValidators: true }
  ).populate("brand_id", "name slug status");

  if (!item) throw new Error("Home content not found");
  return item;
};

const archiveHomeContent = async (id, userId = null) => {
  return updateHomeContent(id, { status: "archived" }, userId);
};

const getMobileHomeContents = async (filters = {}) => {
  const page = toNumber(filters.page, 1);
  const limit = toNumber(filters.limit, 20);
  const now = new Date();
  const query = {
    status: "active",
    $and: [
      { $or: [{ starts_at: null }, { starts_at: { $lte: now } }] },
      { $or: [{ ends_at: null }, { ends_at: { $gte: now } }] },
    ],
  };

  if (filters.brand_id) query.brand_id = filters.brand_id;
  if (filters.type) query.type = filters.type;
  if (filters.language) query.language = filters.language;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    HomeContent.find(query)
      .populate("brand_id", "name slug")
      .sort({ display_order: 1, created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    HomeContent.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = {
  archiveHomeContent,
  createHomeContent,
  getHomeContentById,
  getHomeContents,
  getMobileHomeContents,
  updateHomeContent,
};
