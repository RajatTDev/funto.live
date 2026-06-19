const express = require("express");
const route = express.Router();

const LoginController = require("./login.controller");

route.get("/validateLogin", LoginController.get);

module.exports = route;
