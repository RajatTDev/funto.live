const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../../util/multer");

const UserController = require("./user.controller");
const upload = multer({ storage });

const checkAccessWithKey = require("../../checkAccess");

//get user list
router.get("/getUsers", checkAccessWithKey(), UserController.index);

//get type wise fake data
router.get("/getFakeData", checkAccessWithKey(), UserController.getFakeData);

//get popular user by followers
router.get("/getPopularUser", checkAccessWithKey(), UserController.getPopularUser);

//get profile of user who login
router.get("/profile", checkAccessWithKey(), UserController.getProfile);

//get random match for call
router.get("/random", checkAccessWithKey(), UserController.randomMatch);

//online the user
router.post("/online", UserController.userIsOnline);

//check plan
router.get("/checkPlan", checkAccessWithKey(), UserController.checkPlan);

//search user by name and username
router.post("/user/search", checkAccessWithKey(), UserController.search);

//get user profile of post[feed]
router.post("/getUser", checkAccessWithKey(), UserController.getProfileUser);

//user login and signup
router.post("/loginSignup", checkAccessWithKey(), UserController.loginSignup);

//check referral code is valid and add referral bonus
router.post("/addReferralCode", checkAccessWithKey(), UserController.referralCode);

//admin add or less the rCoin or diamond of user through admin panel
router.post("/addLessCoin", checkAccessWithKey(), UserController.addLessRcoinDiamond);

//update user detail [android]
router.post("/update", checkAccessWithKey(), upload.fields([{ name: "image" }, { name: "coverImage" }]), UserController.updateProfile);

//bock unblock user
router.patch("/blockUnblock/:userId", checkAccessWithKey(), UserController.blockUnblock);

router.patch("/userUniqueId", checkAccessWithKey(), UserController.userUniqueId);

//switch for user live or not by admin
router.put("/switchForEnableLiveUser", checkAccessWithKey(), UserController.switchForEnableLiveUser);

//switch for user live or not by admin
router.put("/gameBlock", checkAccessWithKey(), UserController.switchForGameBlock);

//create Fake user by admin
router.post(
  "/AddFakeUser",
  checkAccessWithKey(),
  upload.fields([{ name: "image" }, { name: "roomImage" }, { name: "link" }, { name: "pkVideoArray" }, { name: "pkImageArray" }]),
  UserController.AddFakeUser
);

//update Fake user by admin
router.patch(
  "/updateFakeUser",
  checkAccessWithKey(),
  upload.fields([{ name: "image" }, { name: "roomImage" }, { name: "link" }, { name: "pkVideoArray" }, { name: "pkImageArray" }]),
  UserController.updateFakeUser
);

//get uniqueId
router.get("/getUsersUniqueIdForAgency", checkAccessWithKey(), UserController.getUsersUniqueIdForAgency);

//get all users with only uniqueId (for create coinSeller dropdown)
router.get("/getUsersUniqueId", checkAccessWithKey(), UserController.getUsersUniqueId);

module.exports = router;
