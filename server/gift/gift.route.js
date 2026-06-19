const express = require("express");
const router = express.Router();

const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

const GiftController = require("./gift.controller");

const checkAccessWithKey = require("../../checkAccess");

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");


// get all gifts
router.get("/all", checkAccessWithKey(), GiftController.index);

// get category wise gift
router.get("/:categoryId", checkAccessWithKey(), GiftController.categoryWiseGift);

// create gift
router.post("/", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.GIFT), upload.any(), GiftController.store);

// svga Add
router.post("/svgaAdd", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.GIFT), upload.fields([{ name: "image" }, { name: "svgaImage" }]), GiftController.svgaAdd);

// update gift
router.patch("/:giftId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.GIFT), upload.fields([{ name: "image" }, { name: "svgaImage" }]), GiftController.update);

// delete image
router.delete("/:giftId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.GIFT), GiftController.destroy);

module.exports = router;
