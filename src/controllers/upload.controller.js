const ApiResponse = require('../utils/apiResponse');

const uploadSingle = async (req, res, next) => {
  try {
    if (!req.file) return ApiResponse.error(res, 'No file uploaded', 400);

    return ApiResponse.success(res, {
      url: req.file.location,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bucket: req.file.bucket,
      key: req.file.key,
    }, 'File uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

const uploadMultiple = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) return ApiResponse.error(res, 'No files uploaded', 400);

    const results = req.files.map(file => ({
      url: file.location,
      mimetype: file.mimetype,
      size: file.size,
      key: file.key,
    }));

    return ApiResponse.success(res, results, `${req.files.length} files uploaded successfully`, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
};
