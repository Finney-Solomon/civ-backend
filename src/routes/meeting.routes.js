const express = require("express");
const router = express.Router();
const meetingController = require("../controllers/meeting.controller");
const { authenticate, requireRole } = require("../middleware/auth");

router.get("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), meetingController.getAll);
router.post("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), meetingController.create);
router.get("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), meetingController.getById);
router.put("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), meetingController.update);
router.patch("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), meetingController.update);
router.delete("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), meetingController.archive);

module.exports = router;
