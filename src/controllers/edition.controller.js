const editionService = require('../services/edition.service');
const sectionService = require('../services/section.service'); // ✅ FIX
const ApiResponse = require('../utils/apiResponse');

class EditionController {
  async create(req, res, next) {
    try {
      const edition = await editionService.createEdition(req.body);
      return ApiResponse.success(res, edition, 'Edition created successfully', 201);
    } catch (error) {
      if (error.message.includes('already exists')) {
        return ApiResponse.error(res, error.message, 409);
      }
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await editionService.getAllEditions(req.query);
      return ApiResponse.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const edition = await editionService.getEditionById(req.params.id);
      return ApiResponse.success(res, edition);
    } catch (error) {
      if (error.message === 'Edition not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const edition = await editionService.updateEdition(req.params.id, req.body);
      return ApiResponse.success(res, edition, 'Edition updated successfully');
    } catch (error) {
      if (error.message === 'Edition not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  async publish(req, res, next) {
    try {
      const edition = await editionService.publishEdition(req.params.id);
      return ApiResponse.success(res, edition, 'Edition published successfully');
    } catch (error) {
      if (error.message === 'Edition not found') {
        return ApiResponse.notFound(res, error.message);
      }
      return ApiResponse.error(res, error.message, 400);
    }
  }

  async unpublish(req, res, next) {
    try {
      const edition = await editionService.unpublishEdition(req.params.id);
      return ApiResponse.success(res, edition, 'Edition unpublished successfully');
    } catch (error) {
      if (error.message === 'Edition not found') {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  /* ---------------- SECTIONS ---------------- */

  async getSections(req, res, next) {
    try {
      const sections = await editionService.getEditionSections(req.params.id);
      return ApiResponse.success(res, sections);
    } catch (error) {
      next(error);
    }
  }

  async createSection(req, res, next) {
    try {
      const section = await sectionService.createForEdition(
        req.params.id,
        req.user.userId,
        req.body
      );
      return ApiResponse.success(res, section, 'Section created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async patchSection(req, res, next) {
    try {
      const section = await sectionService.updateSection(
        req.params.sectionId,
        req.user.userId,
        req.body
      );
      return ApiResponse.success(res, section, 'Section updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteSection(req, res, next) {
    try {
      const result = await sectionService.deleteSection(
        req.params.sectionId,
        req.user.userId
      );
      return ApiResponse.success(res, result, 'Section deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async generateSections(req, res, next) {
    try {
      const result = await editionService.generateSections(req.params.id);
      return ApiResponse.success(res, result, 'Sections generated successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EditionController();
