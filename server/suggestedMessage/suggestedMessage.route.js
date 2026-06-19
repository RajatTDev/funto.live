const express = require("express");
const router = express.Router();

const checkAccessWithKey = require("../../checkAccess");

const SuggestedMessageCtr = require("../suggestedMessage/suggestedMessage.controller");

router.get("/getAllSuggestedMessages", checkAccessWithKey(), SuggestedMessageCtr.getAllSuggestedMessages);

router.post("/addSuggestedMessage", checkAccessWithKey(), SuggestedMessageCtr.addSuggestedMessage);

router.patch("/updateSuggestedMessage", checkAccessWithKey(), SuggestedMessageCtr.updateSuggestedMessage);

router.delete("/deleteSuggestedMessage", checkAccessWithKey(), SuggestedMessageCtr.deleteSuggestedMessage);

module.exports = router;
