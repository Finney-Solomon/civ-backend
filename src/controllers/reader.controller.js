const readerService = require('../services/reader.service');
const ApiResponse = require('../utils/apiResponse');

class ReaderController {
  async getEditions(req, res, next) {
    try {
      const result = await readerService.getPublishedEditions(req.query);
      return ApiResponse.success(res, result);
    } catch (error) {
      if (error.message === 'Brand not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  async getEditionSections(req, res, next) {
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
  }
}

module.exports = new ReaderController();
