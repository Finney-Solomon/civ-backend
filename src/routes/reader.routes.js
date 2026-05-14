const express = require('express');
const router = express.Router();
const readerController = require('../controllers/reader.controller');
const meetingController = require('../controllers/meeting.controller');
const homeContentController = require('../controllers/homeContent.controller');
const { authenticate } = require('../middleware/auth');

router.get('/editions', authenticate, readerController.getEditions);
router.get('/editions/:id', authenticate, readerController.getEditionDetails);
router.get('/editions/:id/sections', authenticate, readerController.getEditionSections);
router.get('/meetings', authenticate, meetingController.getMobileMeetings);
router.get('/home-content', authenticate, homeContentController.getMobileHomeContents);

module.exports = router;
