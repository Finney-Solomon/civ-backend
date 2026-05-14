const meetingService = require("../services/meeting.service");
const ApiResponse = require("../utils/apiResponse");

const getAll = async (req, res, next) => {
  try {
    const result = await meetingService.getMeetings(req.query);
    return ApiResponse.success(res, result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const meeting = await meetingService.createMeeting(req.body, req.user?.userId || null);
    return ApiResponse.success(res, meeting, "Meeting created successfully", 201);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const meeting = await meetingService.getMeetingById(req.params.id);
    return ApiResponse.success(res, meeting);
  } catch (error) {
    if (error.message === "Meeting not found") return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const meeting = await meetingService.updateMeeting(
      req.params.id,
      req.body,
      req.user?.userId || null
    );
    return ApiResponse.success(res, meeting, "Meeting updated successfully");
  } catch (error) {
    if (error.message === "Meeting not found") return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const archive = async (req, res, next) => {
  try {
    const meeting = await meetingService.archiveMeeting(req.params.id, req.user?.userId || null);
    return ApiResponse.success(res, meeting, "Meeting archived successfully");
  } catch (error) {
    if (error.message === "Meeting not found") return ApiResponse.notFound(res, error.message);
    next(error);
  }
};

const getMobileMeetings = async (req, res, next) => {
  try {
    const result = await meetingService.getMobileMeetings(req.query);
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
  getMobileMeetings,
  update,
};
