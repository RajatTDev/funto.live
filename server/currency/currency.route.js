const express = require("express");
const router = express.Router();

const CurrencyController = require("./currency.controller");

const checkAccessWithKey = require("../../checkAccess");

router.post("/createCurrency", checkAccessWithKey(), CurrencyController.createCurrency);
router.patch("/updateCurrency", checkAccessWithKey(), CurrencyController.updateCurrency);
router.get("/getAllCurrencies", checkAccessWithKey(), CurrencyController.getAllCurrencies);
router.delete("/deleteCurrency", checkAccessWithKey(), CurrencyController.deleteCurrency);
router.patch("/setDefaultCurrency", checkAccessWithKey(), CurrencyController.setDefaultCurrency);
router.get("/getDefaultCurrency", checkAccessWithKey(), CurrencyController.getDefaultCurrency);

module.exports = router;
