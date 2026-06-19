const express = require("express");
const router = express.Router();

const multer = require("multer");
const { storage } = require("../../util/multer");

const SongController = require("./song.controller");

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

const upload = multer({
  storage,
});

const checkAccessWithKey = require("../../checkAccess");

// router.use(checkAccessWithSecretKey());

//get song list
router.get("/", checkAccessWithKey(), SongController.index);

//create song
router.post(
  "/", checkAccessWithKey(),
  AdminMiddleware,
  checkPermission(MODULES.SONG),
  upload.fields([{ name: "image" }, { name: "song" }]),
  SongController.store
);

//update song
router.patch(
  "/:songId", checkAccessWithKey(),
  AdminMiddleware,
  checkPermission(MODULES.SONG),
  upload.fields([{ name: "image" }, { name: "song" }]),
  SongController.update
);

//delete song
router.delete("/:songId", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.SONG), SongController.destroy);

module.exports = router;
