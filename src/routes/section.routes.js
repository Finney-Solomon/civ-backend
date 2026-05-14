const express = require("express");
const router = express.Router();

const sectionController = require("../controllers/section.controller");
const audioController = require("../controllers/audio.controller");
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

// TTS audio
router.post(
  "/:id/audio/generate",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN", "AUTHOR"),
  audioController.generate
);

router.post(
  "/:id/audio/regenerate",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN", "AUTHOR"),
  audioController.regenerate
);

router.delete(
  "/:id/audio",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN", "AUTHOR"),
  audioController.delete
);

// ─── TEST ONLY: Stream audio directly (no S3 needed) ───
router.post(
  "/:id/audio/test-generate",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN", "AUTHOR"),
  audioController.testGenerate
);

module.exports = router;
