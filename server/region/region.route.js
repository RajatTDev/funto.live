const express = require("express");
const router = express.Router();

var checkAccessWithSecretKey = require("../../checkAccess");

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

const RegionController = require("./region.controller");

//create region
router.post("/store", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.REGION), RegionController.store);

//update region
router.patch("/update", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.REGION), RegionController.update);

//active or not region
router.patch("/activeOrNot", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.REGION), RegionController.activeOrNot);

//get all regions
router.get("/index", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.REGION), RegionController.index);

//get active regions for dropdown
router.get("/getActiveRegions", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.REGION), RegionController.getActiveRegions);

//delete region
router.delete("/destroy", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.REGION), RegionController.destroy);

module.exports = router;
