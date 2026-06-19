const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

const HostRequestController = require("./hostRequest.controller");
const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

//create host request by particular user
route.post(
    "/createRequest",
    checkAccessWithSecretKey(),
    upload.fields([{ name: "profileImage" }, { name: "document" }]),
    HostRequestController.createRequest
);

//accept or decline host request by admin
route.patch("/acceptOrDecline", checkAccessWithSecretKey(), AdminMiddleware, checkPermission(MODULES.HOST_REQUEST), HostRequestController.acceptOrDecline);

//get all requests
route.get("/index", checkAccessWithSecretKey(), HostRequestController.index);

//add agency
route.patch("/addAgency", HostRequestController.addAgency);

route.get("/requestGetByAgency", checkAccessWithSecretKey(), HostRequestController.getAgencyWise);

module.exports = route;
