const express = require("express");
const route = express.Router();

const checkAccessWithKey = require("../../checkAccess");
route.use(checkAccessWithKey());

const hostController = require("./host.controller");

route.get("/topCreators", hostController.topCreators);

route.get("/profile", hostController.getProfile);

route.get("/callHistory", hostController.callHistory);

route.get("/liveStreaming", hostController.liveStreaming);

route.get("/hostHistoryByDate", hostController.hostHistoryByDate);

route.get("/hostCallHistoryForAgency", hostController.hostCallHistoryForAgency);

route.get("/hostCoinEarningForAgency", hostController.hostCoinEarningForAgency);

route.get("/hostLiveHistoryForAgency", hostController.hostLiveHistoryForAgency);

//bock unblock user
route.patch("/isBlock", checkAccessWithKey(), hostController.blockUnblock);

// all host with search
route.get("/", hostController.index);

module.exports = route;
