const express = require("express");
const router = express.Router();

const WalletController = require("./wallet.controller");

const checkAccessWithKey = require("../../checkAccess");

// get all history of user [admin panel]
router.post("/", checkAccessWithKey(), WalletController.history);

// get income and outgoing total [diamond & rCoin]
router.get("/diamondRcoinTotal", checkAccessWithKey(), WalletController.incomeOutgoingDiamondRcoinTotal);

// get income and outgoing history [diamond & rCoin]
router.get("/diamondRcoinHistory", checkAccessWithKey(), WalletController.incomeOutgoingDiamondRcoinHistory);

//get free diamond from watching ad
router.post("/income/seeAd", checkAccessWithKey(), WalletController.getDiamondFromAd);

// store call details when user do call
router.post("/call", checkAccessWithKey(), WalletController.call);

// convert rCoin to diamond
router.post("/convertRcoinToDiamond", checkAccessWithKey(), WalletController.convertRcoinToDiamond);

router.post("/liveAnalytic", checkAccessWithKey(), WalletController.liveAnalytic);

router.post("/live", checkAccessWithKey(), WalletController.historyLive);

//send gift fake host [coin cut]
router.get("/sendGiftFakeHost", checkAccessWithKey(), WalletController.sendGiftFakeHost);

// teenPatti game history
router.get("/teenPatti", checkAccessWithKey(), WalletController.teenPatti);

// teenPatti game history
router.get("/rouletteCasino", checkAccessWithKey(), WalletController.rouletteCasino);

// teenPatti game history
router.get("/ferryWheel", checkAccessWithKey(), WalletController.ferryWheel);

// agency coin total for agency Panel
router.get("/agencyHistory", checkAccessWithKey(), WalletController.agencyHistory);

// agency coin total for agency Panel
router.get("/agencyTodayStats", checkAccessWithKey(), WalletController.agencyTodayStats);

// agency coin total for agency Panel
router.get("/allAgencyHistory", checkAccessWithKey(), WalletController.allAgencyHistory);

module.exports = router;
