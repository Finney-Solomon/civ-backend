// src/routes/admin.users.routes.js
const express = require("express");
const router = express.Router();
const { authenticate, requireRole } = require("../middleware/auth");
const adminUsersController = require("../controllers/admin.users.controller");

// ADMIN ONLY
router.get(
  "/users",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  adminUsersController.listUsers
);

router.post(
  "/users",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  adminUsersController.createUser // create USER / AUTHOR / ADMIN
);

router.get(
  "/users/:id",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  adminUsersController.getUser
);

router.put(
  "/users/:id",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  adminUsersController.updateUser
);

router.patch(
  "/users/:id/status",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  adminUsersController.updateUserStatus
);

// Authors (separate table)
router.get(
  "/authors",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  adminUsersController.listAuthors
);

router.get(
  "/authors/:userId",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  adminUsersController.getAuthor
);

router.put(
  "/authors/:userId",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  adminUsersController.upsertAuthor
);

// Admins only listing
router.get(
  "/admins",
  authenticate,
  requireRole("SUPER_ADMIN", "ADMIN"),
  adminUsersController.listAdmins
);

module.exports = router;
