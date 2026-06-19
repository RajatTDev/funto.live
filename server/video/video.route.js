const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../../util/multer");

const VideoController = require("./video.controller");
const upload = multer({
  storage,
  // limits: {
  //   fileSize: 1034 * 1024 * 1024, // 40 MB file size limit
  // },
});

const checkAccessWithKey = require("../../checkAccess");

// router.use(checkAccessWithKey());

// get all post [frontend]
router.get("/getVideo", checkAccessWithKey(), VideoController.index);

// get user wise video list
router.get("/getRelite", checkAccessWithKey(), VideoController.getVideo);

// get user wise video list
router.get("/getReliteById", checkAccessWithKey(), VideoController.getVideoById);

//create video
router.post("/uploadRelite", checkAccessWithKey(), upload.fields([{ name: "video" }, { name: "screenshot" }, { name: "thumbnail" }]), VideoController.uploadVideo);

// allow disallow comment on V Shorts
router.patch("/relite/commentSwitch/:videoId", checkAccessWithKey(), VideoController.allowDisallowComment);

//create Fake video
router.post("/uploadFakeRelite", checkAccessWithKey(), upload.fields([{ name: "video" }, { name: "screenshot" }, { name: "thumbnail" }]), VideoController.uploadFakeVideo);

//update Fake video
router.patch("/updateFakeRelite", checkAccessWithKey(), upload.fields([{ name: "video" }, { name: "screenshot" }, { name: "thumbnail" }]), VideoController.updateFakeVideo);

// delete video
router.delete("/deleteRelite", checkAccessWithKey(), VideoController.destroy);

//get video by Id [ adminPanel ]
router.get("/videoDetail", checkAccessWithKey(), VideoController.videoDetail);

module.exports = router;
