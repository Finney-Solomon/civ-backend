const sectionService = require('../services/section.service');
const ApiResponse = require('../utils/apiResponse');

class SectionController {
  async getById(req, res, next) {
    try {
      const section = await sectionService.getSectionById(req.params.id);
      return ApiResponse.success(res, section);
    } catch (error) {
      if (error.message === 'Section not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const section = await sectionService.updateSection(
        req.params.id,
        req.user.userId,
        req.body
      );
      return ApiResponse.success(res, section, 'Section updated successfully');
    } catch (error) {
      if (error.message === 'Section not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  async submitReview(req, res, next) {
    try {
      const section = await sectionService.submitForReview(req.params.id);
      return ApiResponse.success(res, section, 'Section submitted for review');
    } catch (error) {
      if (error.message === 'Section not found') {
        return ApiResponse.notFound(res, error.message);
      }
      if (error.message.includes('Cannot submit')) {
        return ApiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const { notes } = req.body;
      const section = await sectionService.approveSection(
        req.params.id,
        req.user.userId,
        notes
      );
      return ApiResponse.success(res, section, 'Section approved');
    } catch (error) {
      if (error.message === 'Section not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  async reject(req, res, next) {
    try {
      const { notes } = req.body;
      const section = await sectionService.rejectSection(
        req.params.id,
        req.user.userId,
        notes
      );
      return ApiResponse.success(res, section, 'Section rejected');
    } catch (error) {
      if (error.message === 'Section not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }
}

module.exports = new SectionController();
