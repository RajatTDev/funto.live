const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../../util/multer");

const BannerController = require("./banner.controller");
const upload = multer({
  storage,
});

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

const checkAccessWithKey = require("../../checkAccess");

// router.use(checkAccessWithKey());

// get all banner for frontend
router.get("/all", checkAccessWithKey(), BannerController.index);

// get VIP and normal banner [android]
router.get("/", checkAccessWithKey(), BannerController.getBanner);

//create banner
router.post("/", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.BANNER), upload.single("image"), BannerController.store);

//update banner
router.patch("/:bannerId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.BANNER), upload.single("image"), BannerController.update);

//VIP switch
router.put("/:bannerId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.BANNER), BannerController.VIPBannerSwitch);

//delete banner
router.delete("/:bannerId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.BANNER), BannerController.destroy);

module.exports = router;
