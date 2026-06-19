const express = require("express");
const router = express.Router();

const agencyRedeemController = require("./agencyRedeem.controller");

var checkAccessWithSecretKey = require("../../checkAccess");

router.use(checkAccessWithSecretKey());

router.post("/store", agencyRedeemController.store);

router.patch("/update", agencyRedeemController.update);

router.get("/getAgencyRedeem", agencyRedeemController.getAgencyRedeem);

router.get("/getAgencyWise", agencyRedeemController.getAgencyWise);

module.exports = router;
