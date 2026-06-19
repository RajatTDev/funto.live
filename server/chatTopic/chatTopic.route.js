const express = require("express");
const route = express.Router();

const checkAccessWithKey = require("../../checkAccess");

const ChatTopicController = require("./chatTopic.controller");

route.get("/chatList", checkAccessWithKey(), ChatTopicController.getChatList);

route.post("/createRoom", checkAccessWithKey(), ChatTopicController.store);

route.delete("/deleteAllChatsAndTopics", checkAccessWithKey(), ChatTopicController.deleteAllChatsAndTopics);

module.exports = route;
