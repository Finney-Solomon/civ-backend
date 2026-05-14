const sectionService = require('../services/section.service');
const { formatSectionForReader } = require('../services/editionAudio.service');
const ApiResponse = require('../utils/apiResponse');

const canViewDraftAudio = (user) => {
  const roles = (user?.roles || []).map((role) => role.role);
  return roles.some((role) => ["SUPER_ADMIN", "ADMIN", "AUTHOR"].includes(role));
};

const getById = async (req, res, next) => {
  try {
    const section = await sectionService.getSectionById(req.params.id);
    const response = canViewDraftAudio(req.user)
      ? section
      : formatSectionForReader(section, Boolean(section.edition_id?.is_audio_available));

    return ApiResponse.success(res, response);
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const section = await sectionService.updateSection(req.params.id, req.user.userId, req.body);
    return ApiResponse.success(res, section, 'Section updated successfully');
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

// route uses sectionController.submitReview
const submitReview = async (req, res, next) => {
  try {
    const section = await sectionService.submitForReview(req.params.id);
    return ApiResponse.success(res, section, 'Section submitted for review');
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    if (error.message === 'Cannot submit empty section for review') return ApiResponse.error(res, error.message, 400);
    next(error);
  }
};

const approve = async (req, res, next) => {
  try {
    const section = await sectionService.approveSection(req.params.id, req.user.userId, req.body.notes);
    return ApiResponse.success(res, section, 'Section approved');
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const reject = async (req, res, next) => {
  try {
    const section = await sectionService.rejectSection(req.params.id, req.user.userId, req.body.notes);
    return ApiResponse.success(res, section, 'Section rejected');
  } catch (error) {
    if (error.message === 'Section not found') return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

module.exports = {
  getById,
  update,
  submitReview,
  approve,
  reject,
};
