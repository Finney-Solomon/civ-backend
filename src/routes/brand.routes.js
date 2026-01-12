const express = require('express');
const router = express.Router();
const brandController = require('../controllers/brand.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, brandController.getAll);
router.post('/', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), brandController.create);
router.get('/:id', authenticate, brandController.getById);
router.put('/:id', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), brandController.update);
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), brandController.delete);

module.exports = router;
