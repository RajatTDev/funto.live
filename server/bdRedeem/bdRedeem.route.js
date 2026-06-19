const express = require("express");
const router = express.Router();

const bdRedeemController = require("./bdRedeem.controller");

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

var checkAccessWithSecretKey = require("../../checkAccess");

router.use(checkAccessWithSecretKey());

//create BD redeem request
router.post("/store", AdminMiddleware, checkPermission(MODULES.BD_REDEEM), bdRedeemController.store);

//accept or decline BD redeem request
router.patch("/update", AdminMiddleware, checkPermission(MODULES.BD_REDEEM), bdRedeemController.update);

//get all BD redeem requests (admin)
router.get("/getBdRedeem", AdminMiddleware, checkPermission(MODULES.BD_REDEEM), bdRedeemController.getBdRedeem);

//get particular BD's redeem requests
router.get("/getBdWise", AdminMiddleware, checkPermission(MODULES.BD_REDEEM), bdRedeemController.getBdWise);

//withdraw request page (3 cards + paginated history)
router.get("/withdrawPage", bdRedeemController.withdrawPage);

//get BD's wallet transaction history
router.get("/getWalletTransactionOfBD", bdRedeemController.getWalletTransactionOfBD);

module.exports = router;
