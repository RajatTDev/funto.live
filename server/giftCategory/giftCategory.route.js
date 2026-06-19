const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../../util/multer");

const CategoryController = require("./giftCategory.controller");
const upload = multer({
  storage,
});

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

const checkAccessWithKey = require("../../checkAccess");

// router.use(checkAccessWithKey());

// get category
router.get("/", checkAccessWithKey(), CategoryController.index);

//create category
router.post("/", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.GIFT_CATEGORY), upload.single("image"), CategoryController.store);

//update category
router.patch("/:categoryId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.GIFT_CATEGORY), upload.single("image"), CategoryController.update);

//delete category
router.delete("/:categoryId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.GIFT_CATEGORY), CategoryController.destroy);

module.exports = router;
