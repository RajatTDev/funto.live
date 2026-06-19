const express = require("express");
const router = express.Router();
const searchHistoryController = require("./searchHistory.controller");

const checkAccessWithKey = require("../../checkAccess");

router.use(checkAccessWithKey());

router.post(
    "/create",
    searchHistoryController.saveSearchHistory
);

router.get(
    "/get",
    searchHistoryController.getSearchHistory
);

router.delete(
    "/delete",
    searchHistoryController.deleteSearchHistory
);

module.exports = router;
