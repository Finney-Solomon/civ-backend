// src/routes/admin.routes.js
const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// Only admins can see overview
router.get(
  "/overview",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  adminController.overview
);

module.exports = router;
