const express = require("express");
const router = express.Router();

const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

var checkAccessWithSecretKey = require("../../checkAccess");

const AgencyController = require("./agency.controller");

//create agency
router.post("/store", upload.single("image"), checkAccessWithSecretKey(), AgencyController.store);

//update agency
router.patch("/update", upload.single("image"), checkAccessWithSecretKey(), AgencyController.update);

//active or not agency
router.patch("/activeOrNot", checkAccessWithSecretKey(), AgencyController.activeOrNot);

//get all agency
router.get("/index", checkAccessWithSecretKey(), AgencyController.index);

//get agency wise host
router.get("/agencyWiseHost",  AgencyController.agencyWiseHost);

//get all agency with agency code dropdown (client)
router.get("/getAgency", checkAccessWithSecretKey(), AgencyController.getAgency);

//agency login
router.post("/login", checkAccessWithSecretKey(), AgencyController.login);

//get agency profile
router.get("/getAgencyProfile", AgencyController.getAgencyProfile);

//get user's redeem requests who is under particular agency
router.get("/getUserRedeem", checkAccessWithSecretKey(), AgencyController.getUserRedeem);

//get agency host history
router.get("/agencyWiseHostHistory", checkAccessWithSecretKey(), AgencyController.agencyWiseHostHistory);



router.post("/createHost", checkAccessWithSecretKey(), AgencyController.createHost);

router.get("/getAgency", checkAccessWithSecretKey(), AgencyController.getAgency);



module.exports = router;
