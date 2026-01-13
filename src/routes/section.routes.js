const express = require("express");
const router = express.Router();

const sectionController = require("../controllers/section.controller");
const { authenticate, requireRole } = require("../middleware/auth");

// read
router.get("/:id", authenticate, sectionController.getById);

// update (support both PUT + PATCH)
router.put(
  "/:id",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN", "AUTHOR"),
  sectionController.update
);

router.patch(
  "/:id",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN", "AUTHOR"),
  sectionController.update
);

// workflow
// ✅ allow AUTHOR + ADMIN so you can test easily (optional but recommended)
router.post(
  "/:id/submit-review",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN", "AUTHOR"),
  sectionController.submitReview
);

router.post(
  "/:id/approve",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  sectionController.approve
);

router.post(
  "/:id/reject",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  sectionController.reject
);

module.exports = router;
