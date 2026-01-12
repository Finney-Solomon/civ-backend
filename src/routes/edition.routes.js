const express = require("express");
const router = express.Router();
const editionController = require("../controllers/edition.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// list + create
router.get("/", authenticate, editionController.getAll);
router.post("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), editionController.create);

// get + update (✅ add PATCH to match frontend)
router.get("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), editionController.getById);
router.put("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), editionController.update);
router.patch("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), editionController.update); // ✅

// publish
router.post("/:id/publish", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), editionController.publish);
router.post("/:id/unpublish", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), editionController.unpublish);

// sections (✅ add missing routes)
router.get("/:id/sections", authenticate, editionController.getSections);
router.post(
  "/:id/sections",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN", "AUTHOR"),
  editionController.createSection
);
router.patch(
  "/:id/sections/:sectionId",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN", "AUTHOR"),
  editionController.patchSection
);
router.delete(
  "/:id/sections/:sectionId",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN", "AUTHOR"),
  editionController.deleteSection
);

// (optional) generate missing sections from template
router.post(
  "/:id/sections/generate",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  editionController.generateSections
);

module.exports = router;
