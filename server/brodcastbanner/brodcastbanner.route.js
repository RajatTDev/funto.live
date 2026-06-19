const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

const BannerController = require("./brodcastbanner.controller");

const checkAccessWithKey = require("../../checkAccess");

router.get("/fetchBanners", checkAccessWithKey(), BannerController.fetchBanners);

router.post("/uploadBanner", checkAccessWithKey(), upload.single("imageUrl"), BannerController.uploadBanner);

router.patch("/updateBanner", checkAccessWithKey(), upload.single("imageUrl"), BannerController.updateBanner);

router.patch("/updateBannerStatus", checkAccessWithKey(), BannerController.updateBannerStatus);

router.get("/retrieveBanners", checkAccessWithKey(), BannerController.retrieveBanners);

router.delete("/discardBanner", checkAccessWithKey(), BannerController.discardBanner);

module.exports = router;
