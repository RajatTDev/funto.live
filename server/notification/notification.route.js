const express = require("express");
const router = express.Router();

const NotificationController = require("./notification.controller");

const checkAccessWithKey = require("../../checkAccess");
const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

// handle user notification
router.post("/", checkAccessWithKey(), NotificationController.handleNotification);

router.post("/user", checkAccessWithKey(),upload.single("image"), NotificationController.particularUserNotification);

router.post("/all", checkAccessWithKey(),upload.single("image"), NotificationController.allUserNotification);


module.exports = router;
