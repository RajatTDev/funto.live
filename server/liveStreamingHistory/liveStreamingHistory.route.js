const express = require("express");
const router = express.Router();

const LiveStreamingHistoryController = require("./liveStreamingHistory.controller");

var checkAccessWithKey = require("../../checkAccess");

//start streaming
router.get("/", checkAccessWithKey(), LiveStreamingHistoryController.getStreamingSummary);

module.exports = router;
