const express = require("express");
const router = express.Router();
const meetingSummary = require("../controller/meetingSummary");


router.post("/caption", meetingSummary.saveCaption)

// POST /meetings/summary
router.get("/summary/:meetingId", meetingSummary.getSummary);

// POST /meetings/highlights
router.get("/highlights/:meetingId", meetingSummary.getHighlights);

module.exports = router;
