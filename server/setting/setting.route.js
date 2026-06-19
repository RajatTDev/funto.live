const express = require("express");
const router = express.Router();

const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

const SettingController = require("./setting.controller");

const AdminMiddleware = require("../middleware/admin.middleware");

const checkAccessWithKey = require("../../checkAccess");

const adminOnly = (req, res, next) => {
  if (req.admin) return next();
  return res.status(403).json({
    status: false,
    message: "Access denied. Only the super-admin can manage roles.",
  });
};

router.get("/isPurchaseCodeValid", checkAccessWithKey(), AdminMiddleware, SettingController.isPurchaseCodeValid);

router.get("/", checkAccessWithKey(), SettingController.getSetting);

router.get("/getGameSetting", checkAccessWithKey(), SettingController.getGameSetting);

router.patch("/:settingId", checkAccessWithKey(), AdminMiddleware, adminOnly, SettingController.update);

router.put("/:settingId", checkAccessWithKey(), AdminMiddleware, adminOnly, SettingController.handleSwitch);

router.patch("/addGame/:settingId", checkAccessWithKey(), upload.single("image"), SettingController.addGame);

router.patch("/updateGame/:settingId", checkAccessWithKey(), upload.single("image"), SettingController.updateGame);

router.patch("/updateGameStatus/:gameId", checkAccessWithKey(), SettingController.updateGameStatus);

router.delete("/deleteGame/:settingId", checkAccessWithKey(), SettingController.deleteGame);

module.exports = router;
