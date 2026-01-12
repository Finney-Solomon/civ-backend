// src/controllers/admin.controller.js
const adminService = require("../services/admin.service");
const ApiResponse = require("../utils/apiResponse");

class AdminController {
  async overview(req, res, next) {
    try {
      // Optional: filter by a brand_id if you pass it as query
      // /api/v1/admin/overview?brand_id=<id>
      const brand_id = req.query.brand_id || undefined;

      const result = await adminService.getOverview({ brand_id });
      return ApiResponse.success(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
