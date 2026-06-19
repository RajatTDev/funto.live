const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

const CoinSellerController = require("./coinSeller.controller");

route.post("/create", checkAccessWithSecretKey(), CoinSellerController.create);

route.patch("/coinByadmin", checkAccessWithSecretKey(), CoinSellerController.coinByadmin);

route.patch("/coinLessByAdmin", checkAccessWithSecretKey(), CoinSellerController.coinLessByAdmin);

route.patch("/activeOrNot", checkAccessWithSecretKey(), CoinSellerController.activeOrNot);

route.patch("/editMobileNumber", checkAccessWithSecretKey(), CoinSellerController.editMobileNumber);

route.get("/getAll", checkAccessWithSecretKey(), CoinSellerController.getAll);

route.patch("/coinByCoinSeller", checkAccessWithSecretKey(), CoinSellerController.coinByCoinSeller);

route.get("/", checkAccessWithSecretKey(), CoinSellerController.index);

route.get("/getCoinSellerUser", checkAccessWithSecretKey(), CoinSellerController.getCoinSellerUser);

module.exports = route;
