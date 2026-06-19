const express = require("express");
const router = express.Router();

const checkAccessWithKey = require("../../checkAccess");

const PaymentMethodController = require("./paymentMethod.controller");

router.post("/addPaymentMethod", checkAccessWithKey(),  PaymentMethodController.addPaymentMethod);

router.patch("/updatePaymentMethod", checkAccessWithKey(),  PaymentMethodController.updatePaymentMethod);

router.patch("/togglePaymentMethodStatus", checkAccessWithKey(),  PaymentMethodController.togglePaymentMethodStatus);

router.get("/getPaymentMethods", checkAccessWithKey(), PaymentMethodController.getPaymentMethods);

router.get("/fetchPaymentMethods", checkAccessWithKey(), PaymentMethodController.fetchPaymentMethods);

router.delete("/deletePaymentMethod", checkAccessWithKey(), PaymentMethodController.deletePaymentMethod);

module.exports = router;
