const express = require("express");
const router = express.Router();

const PkGiftHistoryController = require("./pkGiftHistory.controller");

const checkAccessWithKey = require("../../checkAccess");

router.get("/", checkAccessWithKey(), PkGiftHistoryController.get);

module.exports = router;
