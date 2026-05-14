const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscription.controller");
const { authenticate, requireRole } = require("../middleware/auth");

const requireAdmin = requireRole("SUPER_ADMIN", "ADMIN");

router.get("/me", authenticate, subscriptionController.getMySubscriptions);

router.get("/admin", authenticate, requireAdmin, subscriptionController.getAdminSubscriptions);
router.post("/admin/grant", authenticate, requireAdmin, subscriptionController.grantSubscription);
router.put("/admin/:id", authenticate, requireAdmin, subscriptionController.updateSubscription);
router.delete("/admin/:id", authenticate, requireAdmin, subscriptionController.deleteSubscription);

router.get("/plans/admin", authenticate, requireAdmin, subscriptionController.listPlansAdmin);
router.post("/plans/admin", authenticate, requireAdmin, subscriptionController.createPlanAdmin);
router.get("/plans/admin/:id", authenticate, requireAdmin, subscriptionController.getPlanAdmin);
router.put("/plans/admin/:id", authenticate, requireAdmin, subscriptionController.updatePlanAdmin);
router.delete("/plans/admin/:id", authenticate, requireAdmin, subscriptionController.deactivatePlanAdmin);

router.get("/plans", authenticate, subscriptionController.listPlans);
router.post("/subscribe", authenticate, subscriptionController.subscribe);

module.exports = router;
