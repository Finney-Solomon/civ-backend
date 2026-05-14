const homeContentService = require("../services/homeContent.service");
const ApiResponse = require("../utils/apiResponse");

const getAll = async (req, res, next) => {
  try {
    const result = await homeContentService.getHomeContents(req.query);
    return ApiResponse.success(res, result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const item = await homeContentService.createHomeContent(req.body, req.user?.userId || null);
    return ApiResponse.success(res, item, "Home content created successfully", 201);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const item = await homeContentService.getHomeContentById(req.params.id);
    return ApiResponse.success(res, item);
  } catch (error) {
    if (error.message === "Home content not found") return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const item = await homeContentService.updateHomeContent(
      req.params.id,
      req.body,
      req.user?.userId || null
    );
    return ApiResponse.success(res, item, "Home content updated successfully");
  } catch (error) {
    if (error.message === "Home content not found") return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const archive = async (req, res, next) => {
  try {
    const item = await homeContentService.archiveHomeContent(req.params.id, req.user?.userId || null);
    return ApiResponse.success(res, item, "Home content archived successfully");
  } catch (error) {
    if (error.message === "Home content not found") return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const getMobileHomeContents = async (req, res, next) => {
  try {
    const result = await homeContentService.getMobileHomeContents(req.query);
    return ApiResponse.success(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  archive,
  create,
  getAll,
  getById,
  getMobileHomeContents,
  update,
};
