const editionService = require('../services/edition.service');
const sectionService = require('../services/section.service');
const ApiResponse = require('../utils/apiResponse');

// route uses editionController.getAll
const getAll = async (req, res, next) => {
  try {
    const result = await editionService.getAllEditions(req.query);
    return ApiResponse.success(res, result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const edition = await editionService.createEdition(req.body);
    return ApiResponse.success(res, edition, 'Edition created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const createAndPublish = async (req, res, next) => {
  try {
    const result = await editionService.createAndPublishEdition(
      req.body,
      req.user?.userId || null
    );
    return ApiResponse.success(res, result, 'Edition published successfully', 201);
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    if (error.message === 'Template not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const edition = await editionService.getEditionById(req.params.id);
    return ApiResponse.success(res, edition);
  } catch (error) {
    if (error.message === 'Edition not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const edition = await editionService.updateEdition(req.params.id, req.body);
    return ApiResponse.success(res, edition, 'Edition updated successfully');
  } catch (error) {
    if (error.message === 'Edition not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const publish = async (req, res, next) => {
  try {
    const edition = await editionService.publishEdition(req.params.id);
    return ApiResponse.success(res, edition, 'Edition published successfully');
  } catch (error) {
    if (error.message === 'Edition not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const unpublish = async (req, res, next) => {
  try {
    const edition = await editionService.unpublishEdition(req.params.id);
    return ApiResponse.success(res, edition, 'Edition unpublished successfully');
  } catch (error) {
    if (error.message === 'Edition not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const getSections = async (req, res, next) => {
  try {
    const sections = await editionService.getEditionSections(req.params.id);
    return ApiResponse.success(res, sections);
  } catch (error) {
    next(error);
  }
};

// route uses editionController.createSection
const createSection = async (req, res, next) => {
  try {
    const doc = await sectionService.createForEdition(req.params.id, req.user.userId, req.body);
    return ApiResponse.success(res, doc, 'Section created successfully', 201);
  } catch (error) {
    if (error.statusCode) return ApiResponse.error(res, error.message, error.statusCode);
    next(error);
  }
};

// route uses editionController.patchSection
const patchSection = async (req, res, next) => {
  try {
    const section = await sectionService.updateSection(req.params.sectionId, req.user.userId, req.body);
    return ApiResponse.success(res, section, 'Section updated successfully');
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

// route uses editionController.deleteSection
const deleteSection = async (req, res, next) => {
  try {
    const result = await sectionService.deleteSection(req.params.sectionId);
    return ApiResponse.success(res, result, 'Section deleted');
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const generateSections = async (req, res, next) => {
  try {
    const result = await editionService.generateSections(req.params.id);
    return ApiResponse.success(res, result, 'Sections generated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  create,
  createAndPublish,
  getById,
  update,
  publish,
  unpublish,
  getSections,
  createSection,
  patchSection,
  deleteSection,
  generateSections,
};
