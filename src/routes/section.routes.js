const express = require('express');
const router = express.Router();
const sectionController = require('../controllers/section.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/:id', authenticate, sectionController.getById);
router.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'ADMIN', 'AUTHOR'), sectionController.update);
router.post('/:id/submit-review', authenticate, requireRole('AUTHOR'), sectionController.submitReview);
router.post('/:id/approve', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), sectionController.approve);
router.post('/:id/reject', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), sectionController.reject);

module.exports = router;
