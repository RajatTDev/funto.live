const express = require("express");
const router = express.Router();
const multer = require("multer");

const LevelController = require("./level.controller");

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

const checkAccessWithKey = require("../../checkAccess");

const { storage } = require("../../util/multer");
const upload = multer({ storage });

// router.use(checkAccessWithSecretKey());

// get level
router.get("/", checkAccessWithKey(), LevelController.index);

// create level
router.post("/", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.LEVEL), upload.single("image"), LevelController.store);

// update level
router.patch("/:levelId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.LEVEL), upload.single("image"), LevelController.update);

// update accessible function of level
router.patch("/", checkAccessWithKey(), LevelController.updateAccessibleFunction);

// delete level
router.delete("/:levelId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.LEVEL), LevelController.destroy);

module.exports = router;
