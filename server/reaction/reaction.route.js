const express = require("express");
const router = express.Router();

const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

const checkAccessWithKey = require("../../checkAccess");

const ReactionController = require("./reaction.controller");

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

//store reaction
router.post("/add", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.REACTION), upload.single("image"), ReactionController.store);

//update reaction
router.patch("/update", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.REACTION), upload.single("image"), ReactionController.update);

//get reaction
router.get("/getReaction", checkAccessWithKey(), ReactionController.get);

//delete reaction
router.delete("/delete", checkAccessWithKey(), AdminMiddleware, checkPermission(MODULES.REACTION), ReactionController.destroy);

module.exports = router;
