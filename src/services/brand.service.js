const { MagazineBrand } = require('../models');

class BrandService {
  async createBrand(data) {
    const brand = await MagazineBrand.create(data);
    return brand;
  }

  async getAllBrands(filters = {}) {
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
  }

  async getBrandById(id) {
    const brand = await MagazineBrand.findById(id)
      .populate('default_template_id')
      .lean();

    if (!brand) {
      throw new Error('Brand not found');
    }

    return brand;
  }

  async getBrandBySlug(slug) {
    const brand = await MagazineBrand.findOne({ slug })
      .populate('default_template_id')
      .lean();

    if (!brand) {
      throw new Error('Brand not found');
    }

    return brand;
  }

  async updateBrand(id, data) {
    const brand = await MagazineBrand.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).populate('default_template_id');

    if (!brand) {
      throw new Error('Brand not found');
    }

    return brand;
  }

  async deleteBrand(id) {
    const brand = await MagazineBrand.findByIdAndUpdate(
      id,
      { status: 'archived' },
      { new: true }
    );

    if (!brand) {
      throw new Error('Brand not found');
    }

    return brand;
  }
}

module.exports = new BrandService();
