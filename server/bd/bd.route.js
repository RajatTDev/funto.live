const express = require("express");
const router = express.Router();

const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

var checkAccessWithSecretKey = require("../../checkAccess");

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

const BdController = require("./bd.controller");

//create BD
router.post("/store", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.BD), upload.single("image"), BdController.store);

//update BD
router.patch("/update", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.BD), upload.single("image"), BdController.update);

//active or not BD
router.patch("/activeOrNot", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.BD), BdController.activeOrNot);

//get all BDs
router.get("/index", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.BD), BdController.index);

//get BD profile
router.get("/profile", BdController.getBdProfile);

//get agencies under a BD
router.get("/bdAgencies", checkAccessWithSecretKey(), BdController.getBdAgencies);

//get users dropdown for BD creation
router.get("/getUsersDropdown", checkAccessWithSecretKey(), BdController.getUsersDropdown);

//get BD dropdown for agency creation
router.get("/getBDDropdown", checkAccessWithSecretKey(), BdController.getBDDropdown);

//admin add or deduct coins from BD
router.post("/addDeductCoin", checkAccessWithSecretKey(), BdController.addDeductCoin);

//dashboard APIs
router.get("/dashboardCards", checkAccessWithSecretKey(), BdController.dashboardCards);
router.get("/revenueTrend", checkAccessWithSecretKey(), BdController.revenueTrend);

//my agencies & agency detail APIs
router.get("/myAgencies", checkAccessWithSecretKey(), BdController.myAgencies);
router.get("/agencyDetail", checkAccessWithSecretKey(), BdController.agencyDetail);
router.get("/agencyCharts", checkAccessWithSecretKey(), BdController.agencyCharts);

//hosts under agencies & commission overview
router.get("/hostsUnderAgencies", checkAccessWithSecretKey(), BdController.hostsUnderAgencies);
router.get("/commissionOverview", checkAccessWithSecretKey(), BdController.commissionOverview);
router.get("/commissionBreakdown", checkAccessWithSecretKey(), BdController.commissionBreakdown);

// get setting for BD
router.get("/getBdSetting", checkAccessWithSecretKey(), BdController.getBdSetting);

module.exports = router;
