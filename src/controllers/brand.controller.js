const brandService = require('../services/brand.service');
const ApiResponse = require('../utils/apiResponse');

class BrandController {
  async create(req, res, next) {
    try {
      const brand = await brandService.createBrand(req.body);
      return ApiResponse.success(res, brand, 'Brand created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await brandService.getAllBrands(req.query);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const brand = await brandService.getBrandById(req.params.id);
      return ApiResponse.success(res, brand);
    } catch (error) {
      if (error.message === 'Brand not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const brand = await brandService.updateBrand(req.params.id, req.body);
      return ApiResponse.success(res, brand, 'Brand updated successfully');
    } catch (error) {
      if (error.message === 'Brand not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await brandService.deleteBrand(req.params.id);
      return ApiResponse.success(res, null, 'Brand archived successfully');
    } catch (error) {
      if (error.message === 'Brand not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }
}

module.exports = new BrandController();
