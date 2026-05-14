const adminService = require('../services/admin.service');
const ApiResponse = require('../utils/apiResponse');

// route uses adminController.overview
const overview = async (req, res, next) => {
  try {
    const brand_id = req.query.brand_id || undefined;
    const result = await adminService.getOverview({ brand_id });
    return ApiResponse.success(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  overview,
};
