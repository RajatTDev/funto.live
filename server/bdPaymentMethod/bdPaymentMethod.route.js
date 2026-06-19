const express = require("express");
const router = express.Router();

const checkAccessWithKey = require("../../checkAccess");
const BDPaymentMethodController = require("./bdPaymentMethod.controller");

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");


// create bd payment method
router.post(
  "/addBDPaymentMethod",
  checkAccessWithKey(),
  AdminMiddleware,
  checkPermission(MODULES.BD_PAYMENT_METHOD),
  BDPaymentMethodController.addBDPaymentMethod
);

// update bd payment method
router.patch(
  "/updateBDPaymentMethod",
  checkAccessWithKey(),
  AdminMiddleware,
  checkPermission(MODULES.BD_PAYMENT_METHOD),
  BDPaymentMethodController.updateBDPaymentMethod
);

// toggle isActive
router.patch(
  "/toggleBDPaymentMethodStatus",
  checkAccessWithKey(),
  AdminMiddleware,
  checkPermission(MODULES.BD_PAYMENT_METHOD),
  BDPaymentMethodController.toggleBDPaymentMethodStatus
);

// get all bd payment methods
router.get(
  "/getBDPaymentMethods",
  checkAccessWithKey(),
  AdminMiddleware,
  checkPermission(MODULES.BD_PAYMENT_METHOD),
  BDPaymentMethodController.getBDPaymentMethods
);

// get active bd payment method
router.get(
  "/fetchBDPaymentMethods",
  checkAccessWithKey(),
  BDPaymentMethodController.fetchBDPaymentMethods
);

// delete bd payment method
router.delete(
  "/deleteBDPaymentMethod",
  checkAccessWithKey(),
  AdminMiddleware,
  checkPermission(MODULES.BD_PAYMENT_METHOD),
  BDPaymentMethodController.deleteBDPaymentMethod
);

module.exports = router;