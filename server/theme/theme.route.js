const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../../util/multer");

const ThemeController = require("./theme.controller");
const upload = multer({
  storage,
});

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

const checkAccessWithKey = require("../../checkAccess");

router.patch("/setDefaultTheme", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.THEME), ThemeController.setDefaultTheme);

router.get("/", checkAccessWithKey(), ThemeController.index);

router.post("/", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.THEME), upload.any(), ThemeController.store);

router.patch("/:themeId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.THEME), upload.single("theme"), ThemeController.update);

router.delete("/:themeId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.THEME), ThemeController.destroy);

module.exports = router;
