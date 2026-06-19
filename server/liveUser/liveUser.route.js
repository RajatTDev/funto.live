const express = require("express");
const router = express.Router();

const LiveUserController = require("./liveUser.controller");

const checkAccessWithKey = require("../../checkAccess");

const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

router.post("/generateAuthToken", checkAccessWithKey(), LiveUserController.generateAuthToken);

router.patch("/updateRoomImage", checkAccessWithKey(), upload.single("roomImage"), LiveUserController.updateRoomImage);

router.patch("/updatePrivateCode", checkAccessWithKey(), LiveUserController.updatePrivateCode);

router.get("/", checkAccessWithKey(), LiveUserController.getLiveUser);

router.get("/fakeLiveUser", checkAccessWithKey(), LiveUserController.fakeLiveUser);

router.patch("/live", checkAccessWithKey(), upload.single("roomImage"), LiveUserController.userIsLive);

router.patch("/broadcastAlertSound", checkAccessWithKey(), LiveUserController.broadcastAlertSound);

router.get("/getTime", checkAccessWithKey(), LiveUserController.liveTime);

router.get("/generateAgoraToken", checkAccessWithKey(), LiveUserController.generateToken);

router.get("/getLiveUserByAdmin", checkAccessWithKey(), LiveUserController.getLiveUserByAdmin);

router.post("/liveStreamingCutByAdmin", checkAccessWithKey(), LiveUserController.liveStreamingCutByAdmin);

router.delete("/terminateAudioSession", checkAccessWithKey(), LiveUserController.terminateAudioSession);

router.get("/checkLive", checkAccessWithKey(), LiveUserController.checkLive);

router.get("/fansRanking", checkAccessWithKey(), LiveUserController.fansRanking);

router.get("/fetchUserSpendingRankings", checkAccessWithKey(), LiveUserController.fetchUserSpendingRankings);

router.get("/fetchHostReceivingRankings", checkAccessWithKey(), LiveUserController.fetchHostReceivingRankings);

router.get("/fetchAgencyReceivingRankings", checkAccessWithKey(), LiveUserController.fetchAgencyReceivingRankings);

module.exports = router;
