const express = require("express");
const router = express.Router();
const homeContentController = require("../controllers/homeContent.controller");
const { authenticate, requireRole } = require("../middleware/auth");

router.get("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), homeContentController.getAll);
router.post("/", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), homeContentController.create);
router.get("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), homeContentController.getById);
router.put("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), homeContentController.update);
router.patch("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), homeContentController.update);
router.delete("/:id", authenticate, requireRole("SUPER_ADMIN", "ADMIN"), homeContentController.archive);

module.exports = router;
