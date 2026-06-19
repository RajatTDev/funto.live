const express = require("express");
const router = express.Router();

const roleCtrl = require("./role.controller");

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

// Create Role
router.post("/defineRole", AdminMiddleware, adminOnly, roleCtrl.defineRole);

// Update Role
router.patch("/reviseRole", AdminMiddleware, adminOnly, roleCtrl.reviseRole);

// Get All Roles
router.get("/browseRoles", AdminMiddleware, adminOnly, roleCtrl.browseRoles);

// Delete Role
router.delete("/eraseRole", AdminMiddleware, adminOnly, roleCtrl.eraseRole);

// Get All Roles ( When Create Staff )
router.get("/eligibleRoles", AdminMiddleware, adminOnly, roleCtrl.eligibleRoles);

// Toggle Role Active Status
router.patch("/shiftRoleState", AdminMiddleware, adminOnly, roleCtrl.shiftRoleState);

module.exports = router;
