const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const uploadController = require('../controllers/upload.controller');
const { authenticate, requireRole } = require('../middleware/auth');

/**
 * Handle Single Uploads
 */
router.post(
  '/image',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMIN', 'AUTHOR'),
  upload.single('image'),
  uploadController.uploadSingle
);

router.post(
  '/audio',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMIN', 'AUTHOR'),
  upload.single('audio'),
  uploadController.uploadSingle
);

router.post(
  '/pdf',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMIN'),
  upload.single('pdf'),
  uploadController.uploadSingle
);

/**
 * Handle Multiple Uploads (e.g., photo gallery in a section)
 */
router.post(
  '/batch',
  authenticate,
  requireRole('SUPER_ADMIN', 'ADMIN', 'AUTHOR'),
  upload.array('files', 10),
  uploadController.uploadMultiple
);

module.exports = router;
