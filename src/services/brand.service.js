const { MagazineBrand } = require('../models');

/**
 * Register a new magazine brand
 */
const createBrand = async (data) => {
  const brand = await MagazineBrand.create(data);
  return brand;
};

/**
 * List all brands with filters and pagination
 */
const getAllBrands = async (filters = {}) => {
  const { status, search, page = 1, limit = 20 } = filters;
  const query = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [brands, total] = await Promise.all([
    MagazineBrand.find(query)
      .populate('default_template_id')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MagazineBrand.countDocuments(query),
  ]);

  return {
    brands,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get brand by ID
 */
const getBrandById = async (id) => {
  const brand = await MagazineBrand.findById(id)
    .populate('default_template_id')
    .lean();

  if (!brand) {
    throw new Error('Brand not found');
  }

  return brand;
};

/**
 * Get brand by Slug
 */
const getBrandBySlug = async (slug) => {
  const brand = await MagazineBrand.findOne({ slug })
    .populate('default_template_id')
    .lean();

  if (!brand) {
    throw new Error('Brand not found');
  }

  return brand;
};

/**
 * Update brand metadata
 */
const updateBrand = async (id, data) => {
  const brand = await MagazineBrand.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  ).populate('default_template_id');

  if (!brand) {
    throw new Error('Brand not found');
  }

  return brand;
};

/**
 * Archive a brand (soft delete)
 */
const deleteBrand = async (id) => {
  const brand = await MagazineBrand.findByIdAndUpdate(
    id,
    { status: 'archived' },
    { new: true }
  );

  if (!brand) {
    throw new Error('Brand not found');
  }

  return brand;
};

module.exports = {
  createBrand,
  getAllBrands,
  getBrandById,
  getBrandBySlug,
  updateBrand,
  deleteBrand,
};
