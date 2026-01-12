// apps/server/routes/template.routes.js
const express = require("express");
const router = express.Router();

const { authenticate, requireRole } = require("../middleware/auth");
const controller = require("../controllers/template.controller");

router.get("/", authenticate, controller.getTemplates);
router.get("/:id", authenticate, controller.getTemplateById);

router.post(
  "/",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  controller.createTemplate
);

router.put(
  "/:id",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  controller.updateTemplate
);

router.delete(
  "/:id",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  controller.deleteTemplate
);

module.exports = router;
