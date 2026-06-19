const express = require("express");
const router = express.Router();

const subAdminCtrl = require("./subAdmin.controller");

const checkAccessWithSecretKey = require("../../checkAccess");

const AdminMiddleware = require("../middleware/admin.middleware");

router.use(checkAccessWithSecretKey());

const adminOnly = (req, res, next) => {
  if (req.admin) return next();
  return res.status(403).json({
    status: false,
    message: "Access denied. Only the super-admin can manage roles.",
  });
};

// Create sub admin
router.post("/enrollSubAdmin", AdminMiddleware, adminOnly, subAdminCtrl.enrollSubAdmin);

// Update Sub Admin
router.patch("/reshapeSubAdmin", AdminMiddleware, adminOnly, subAdminCtrl.reshapeSubAdmin);

// Toggle Sub Admin Active Status
router.patch("/alterSubAdminState", AdminMiddleware, adminOnly, subAdminCtrl.alterSubAdminState);

// Delete Sub Admin
router.delete("/purgeSubAdmin", AdminMiddleware, adminOnly, subAdminCtrl.purgeSubAdmin);

// Get All Sub Admin
router.get("/scanSubAdmins", AdminMiddleware, adminOnly, subAdminCtrl.scanSubAdmins);

// Login Sub Admin
router.post("/signInSubAdmin", subAdminCtrl.signInSubAdmin);

module.exports = router;
