const brandService = require('../services/brand.service');
const ApiResponse = require('../utils/apiResponse');

// route uses brandController.getAll
const getAll = async (req, res, next) => {
  try {
    const result = await brandService.getAllBrands(req.query);
    return ApiResponse.success(res, result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const brand = await brandService.createBrand(req.body);
    return ApiResponse.success(res, brand, 'Brand created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const brand = await brandService.getBrandBySlug(req.params.slug);
    return ApiResponse.success(res, brand);
  } catch (error) {
    if (error.message === 'Brand not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const brand = await brandService.getBrandById(req.params.id);
    return ApiResponse.success(res, brand);
  } catch (error) {
    if (error.message === 'Brand not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const brand = await brandService.updateBrand(req.params.id, req.body);
    return ApiResponse.success(res, brand, 'Brand updated successfully');
  } catch (error) {
    if (error.message === 'Brand not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

// route uses brandController.delete
const deleteBrand = async (req, res, next) => {
  try {
    const brand = await brandService.deleteBrand(req.params.id);
    return ApiResponse.success(res, brand, 'Brand archived successfully');
  } catch (error) {
    if (error.message === 'Brand not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

module.exports = {
  getAll,
  create,
  getBySlug,
  getById,
  update,
  delete: deleteBrand,  // 'delete' is reserved so we alias it
};
