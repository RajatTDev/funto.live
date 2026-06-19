const express = require("express");
const route = express.Router();

const checkAccessWithKey = require("../../checkAccess");

const BlockController = require("./block.controller");

route.post("/blockOrUnblockUser", checkAccessWithKey(), BlockController.blockOrUnblockUser);

route.get("/getBlockedUsers", checkAccessWithKey(), BlockController.getBlockedUsers);

route.get("/getUsersWhoBlockedMe", checkAccessWithKey(), BlockController.getUsersWhoBlockedMe);

module.exports = route;
