const express = require("express");
const router = express.Router();

const gameAdminCoinController = require("./gameAdminCoin.controller");

const checkAccessWithKey = require("../../checkAccess");

router.get("/reset", checkAccessWithKey(), gameAdminCoinController.reset);

module.exports = router;
