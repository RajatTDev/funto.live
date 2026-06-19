const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

const CoinSellerHistoryController = require("./coinSellerHistory.controller");

//get history of particular coinSeller
route.get("/getCoinSellerHistory", checkAccessWithSecretKey(), CoinSellerHistoryController.getCoinSellerHistory);

//get history of the coinseller user (coin given to another user by him) (client)
route.get("/historyOfCoinSellerToUser", checkAccessWithSecretKey(), CoinSellerHistoryController.historyOfCoinSellerToUser);

module.exports = route;
