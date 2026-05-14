const readerService = require('../services/reader.service');
const ApiResponse = require('../utils/apiResponse');

/**
 * Get Published active editions
 */
const getEditions = async (req, res, next) => {
  try {
    const result = await readerService.getPublishedEditions(req.query);
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.message === 'Brand not found') {
      return ApiResponse.notFound(res, error.message);
    }
    next(error);
  }
};

/**
 * Get complete edition details for mobile
 */
const getEditionDetails = async (req, res, next) => {
  try {
    const result = await readerService.getEditionDetails(
      req.params.id,
      req.user.userId
    );
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.message === 'Edition not found or not published') {
      return ApiResponse.notFound(res, error.message);
    }
    if (error.message === 'Active subscription required') {
      return ApiResponse.forbidden(res, error.message);
    }
    next(error);
  }
};

/**
 * Get Sections for a specific edition with subscription check
 */
const getEditionSections = async (req, res, next) => {
  try {
    const result = await readerService.getEditionSections(
      req.params.id,
      req.user.userId
    );
    return ApiResponse.success(res, result);
  } catch (error) {
    if (error.message === 'Edition not found or not published') {
      return ApiResponse.notFound(res, error.message);
    }
    if (error.message === 'Active subscription required') {
      return ApiResponse.forbidden(res, error.message);
    }
    next(error);
  }
};

module.exports = {
  getEditions,
  getEditionDetails,
  getEditionSections,
};
