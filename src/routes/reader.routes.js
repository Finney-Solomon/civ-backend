const express = require('express');
const router = express.Router();
const readerController = require('../controllers/reader.controller');
const { authenticate } = require('../middleware/auth');

router.get('/editions', authenticate, readerController.getEditions);
router.get('/editions/:id/sections', authenticate, readerController.getEditionSections);

module.exports = router;
