const express = require("express");
const meetingController = require("../controller/meetinngController");

const router = express.Router();

router.get("/create-meeting", meetingController.createMeeting);

module.exports = router;