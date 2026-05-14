const express = require("express");
const router = express.Router();
const meetingController = require("../controllers/meeting.controller");
const homeContentController = require("../controllers/homeContent.controller");

router.get("/meetings", meetingController.getMobileMeetings);
router.get("/home-content", homeContentController.getMobileHomeContents);

module.exports = router;
