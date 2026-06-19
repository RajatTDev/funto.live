const Setting = require("./setting.model");
const Config = require("../../config");
const BD = require("../bd/bd.model");
const Admin = require("../admin/admin.model");
const axios = require("axios");
const mongoose = require("mongoose");

const Joi = require("joi");

const sha256Regex = /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/;
const androidAssetLinksSchema = Joi.array()
  .min(1)
  .max(5)
  .items(
    Joi.object({
      relation: Joi.array().items(Joi.string().valid("delegate_permission/common.handle_all_urls")).min(1).required(),

      target: Joi.object({
        namespace: Joi.string().valid("android_app").required(),

        package_name: Joi.string()
          .pattern(/^[a-zA-Z0-9_.]+$/)
          .required(),

        sha256_cert_fingerprints: Joi.array().min(1).max(10).items(Joi.string().uppercase().pattern(sha256Regex).required()).required(),
      })
        .required()
        .unknown(false),
    })
      .required()
      .unknown(false),
  )
  .required();

// check purchase code
const _0x2ae615 = _0x4da9;
function _0x4da9(_0x522f02, _0x24bc8f) {
  _0x522f02 = _0x522f02 - (0x2e9 * -0xb + -0x3ad * -0x9 + 0x90);
  const _0x46f805 = _0x5b77();
  let _0x1eb80e = _0x46f805[_0x522f02];
  return _0x1eb80e;
}
((function (_0xd3791c, _0x3443c2) {
  const _0x9e8675 = _0x4da9,
    _0x445989 = _0xd3791c();
  while (!![]) {
    try {
      const _0x4bc0d9 =
        (-parseInt(_0x9e8675(0x1a3)) / (-0x22df * -0x1 + -0xc6b + -0x1673)) * (-parseInt(_0x9e8675(0x1ed)) / (-0x1 * 0x247f + -0x1ef2 + -0x4373 * -0x1)) +
        -parseInt(_0x9e8675(0x1a9)) / (-0x16f * 0x4 + -0x1 * 0x1058 + 0x27 * 0x91) +
        parseInt(_0x9e8675(0x1ca)) / (-0x1ea6 + -0x19c0 * -0x1 + 0x25 * 0x22) +
        (-parseInt(_0x9e8675(0x1e9)) / (-0x1348 * -0x1 + 0x1b60 + -0x1 * 0x2ea3)) * (parseInt(_0x9e8675(0x1d3)) / (0x1c * 0x100 + 0xac * -0x14 + -0xe8a)) +
        -parseInt(_0x9e8675(0x1c1)) / (-0x70 * -0x57 + 0x1 * -0x1dd2 + -0x837) +
        parseInt(_0x9e8675(0x1d8)) / (0x8 * -0x154 + -0x19fc + -0x4 * -0x929) +
        (-parseInt(_0x9e8675(0x1c3)) / (-0x57a * 0x3 + -0x1 * 0x545 + 0x15bc)) * (-parseInt(_0x9e8675(0x1e4)) / (0x7 * -0xab + -0x11b1 + 0x1668));
      if (_0x4bc0d9 === _0x3443c2) break;
      else _0x445989["push"](_0x445989["shift"]());
    } catch (_0x5e079d) {
      _0x445989["push"](_0x445989["shift"]());
    }
  }
})(_0x5b77, -0x81d69 + -0x5e23c + -0x11 * -0x126a1),
  (exports[_0x2ae615(0x1b2) + _0x2ae615(0x1d5)] = async (_0x316c9c, _0x2dceb5) => {
    const _0x39d3a6 = _0x2ae615,
      _0x4140bc = {
        dXvUI: _0x39d3a6(0x1b5) + "de",
        BecGQ: _0x39d3a6(0x1c7) + _0x39d3a6(0x1ba) + _0x39d3a6(0x1bd),
        boaJx: _0x39d3a6(0x1d9) + _0x39d3a6(0x1e5),
        VPAWx: _0x39d3a6(0x1bb) + _0x39d3a6(0x1d1) + "e",
        qxJkF: _0x39d3a6(0x1e7) + _0x39d3a6(0x1e1) + "nd",
        rOZvs: _0x39d3a6(0x1c2),
        OpbcJ: _0x39d3a6(0x1a8) + _0x39d3a6(0x1c6) + _0x39d3a6(0x1d4) + _0x39d3a6(0x1d0) + _0x39d3a6(0x1e3) + "s",
        jpAmd: _0x39d3a6(0x1a2),
        HEJAQ: _0x39d3a6(0x1aa) + _0x39d3a6(0x1be) + _0x39d3a6(0x1ec) + _0x39d3a6(0x1a4),
        HwARM: _0x39d3a6(0x1a6) + _0x39d3a6(0x1c5) + _0x39d3a6(0x1ac),
        gZmwJ: _0x39d3a6(0x1b9) + _0x39d3a6(0x1b7),
        rzPId: _0x39d3a6(0x1a7) + _0x39d3a6(0x1cd) + _0x39d3a6(0x1d7) + "de",
      };
    try {
      const _0x1be0af = await Admin[_0x39d3a6(0x1dc)](_0x316c9c[_0x39d3a6(0x1ee)][_0x39d3a6(0x1bc)])[_0x39d3a6(0x1a5)](_0x4140bc[_0x39d3a6(0x1c0)])[_0x39d3a6(0x1d2)]();
      if (!_0x1be0af || !_0x1be0af[_0x39d3a6(0x1b5) + "de"])
        return _0x2dceb5[_0x39d3a6(0x1db)](0xda * 0x1c + 0x1183 + 0x2893 * -0x1)[_0x39d3a6(0x1b1)]({ status: ![], message: _0x4140bc[_0x39d3a6(0x1de)] });
      const _0xd42a46 = _0x1be0af[_0x39d3a6(0x1b5) + "de"],
        _0x4d77af = await axios[_0x39d3a6(0x1b0)](_0x39d3a6(0x1b3) + _0x39d3a6(0x1ea) + _0x39d3a6(0x1e2) + _0x39d3a6(0x1da) + _0x39d3a6(0x1ab) + _0xd42a46, {
          headers: { Authorization: _0x39d3a6(0x1df) + _0x39d3a6(0x1b8) + _0x39d3a6(0x1ad) + _0x39d3a6(0x1c4) },
        }),
        _0x28611e = _0x4d77af?.[_0x39d3a6(0x1dd)];
      console[_0x39d3a6(0x1ce)](_0x4140bc[_0x39d3a6(0x1bf)], _0x28611e[_0x39d3a6(0x1b4)]);
      if (!_0x28611e || !_0x28611e[_0x39d3a6(0x1b6)]) return _0x2dceb5[_0x39d3a6(0x1db)](-0x241 * 0x6 + -0x1763 + 0x25b1)[_0x39d3a6(0x1b1)]({ status: ![], message: _0x4140bc[_0x39d3a6(0x1cc)] });
      const _0x2eabc4 = _0x28611e?.[_0x39d3a6(0x1b4)];
      if (!_0x2eabc4) return _0x2dceb5[_0x39d3a6(0x1db)](0x690 * -0x5 + 0x1 * -0x15f7 + -0xb * -0x50d)[_0x39d3a6(0x1b1)]({ status: ![], message: _0x4140bc[_0x39d3a6(0x1cb)] });
      if (_0x2eabc4[_0x39d3a6(0x1af) + "e"]()[_0x39d3a6(0x1e0)](_0x4140bc[_0x39d3a6(0x1eb)]))
        return _0x2dceb5[_0x39d3a6(0x1db)](0x1 * -0x5cd + -0x1 * 0xb93 + 0x1228)[_0x39d3a6(0x1b1)]({ status: ![], message: _0x4140bc[_0x39d3a6(0x1ae)], allowPaymentSettings: ![] });
      if (_0x2eabc4[_0x39d3a6(0x1af) + "e"]()[_0x39d3a6(0x1e0)](_0x4140bc[_0x39d3a6(0x1c9)]))
        return _0x2dceb5[_0x39d3a6(0x1db)](0x72 + -0x621 * -0x2 + -0xbec)[_0x39d3a6(0x1b1)]({ status: !![], message: _0x4140bc[_0x39d3a6(0x1e8)], allowPaymentSettings: !![] });
      return _0x2dceb5[_0x39d3a6(0x1db)](-0x1eb8 + -0x1 * -0x11cf + -0x2bd * -0x5)[_0x39d3a6(0x1b1)]({ status: ![], message: _0x4140bc[_0x39d3a6(0x1c8)], allowPaymentSettings: ![] });
    } catch (_0x554dc1) {
      return (
        console[_0x39d3a6(0x1ce)](_0x4140bc[_0x39d3a6(0x1e6)], _0x554dc1?.[_0x39d3a6(0x1d6)]?.[_0x39d3a6(0x1dd)] || _0x554dc1[_0x39d3a6(0x1cf)]),
        _0x2dceb5[_0x39d3a6(0x1db)](0x1cfd + 0x3cc + 0xaab * -0x3)[_0x39d3a6(0x1b1)]({ status: ![], message: _0x4140bc[_0x39d3a6(0x1ef)], allowPaymentSettings: ![] })
      );
    }
  }));
function _0x5b77() {
  const _0x22e4d3 = [
    "BecGQ",
    "Bearer\x20G9o",
    "includes",
    "fo\x20not\x20fou",
    "om/v3/mark",
    "nt\x20setting",
    "3935860nahKnL",
    "ponse:",
    "gZmwJ",
    "License\x20in",
    "HEJAQ",
    "2015nwyXWD",
    "i.envato.c",
    "rOZvs",
    "ified\x20succ",
    "46hMseHE",
    "admin",
    "rzPId",
    "extended",
    "3095AeJphe",
    "essfully",
    "select",
    "Unsupporte",
    "Invalid\x20or",
    "Regular\x20li",
    "1518051MrguXM",
    "Extended\x20l",
    "sale?code=",
    "type",
    "RgMzzKmpQP",
    "OpbcJ",
    "toLowerCas",
    "get",
    "json",
    "isPurchase",
    "https://ap",
    "license",
    "purchaseCo",
    "item",
    "or:",
    "1R8snTfNCp",
    "Envato\x20Err",
    "ode\x20not\x20fo",
    "Invalid\x20pu",
    "_id",
    "und",
    "icense\x20ver",
    "boaJx",
    "dXvUI",
    "3144085CsAUAS",
    "regular",
    "18APcrXd",
    "9kOVbapnP",
    "d\x20license\x20",
    "cense\x20is\x20n",
    "Purchase\x20c",
    "HwARM",
    "jpAmd",
    "1076992vSAHvD",
    "qxJkF",
    "VPAWx",
    "\x20expired\x20p",
    "log",
    "message",
    "\x20for\x20payme",
    "rchase\x20cod",
    "lean",
    "5796ZvqDmt",
    "ot\x20allowed",
    "CodeValid",
    "response",
    "urchase\x20co",
    "4653416TtHRKe",
    "Envato\x20Res",
    "et/author/",
    "status",
    "findById",
    "data",
  ];
  _0x5b77 = function () {
    return _0x22e4d3;
  };
  return _0x5b77();
}

// get setting
exports.getSetting = async (req, res) => {
  try {
    const data = global.settingJSON ? global.settingJSON : null;

    return res.status(200).send({ status: true, message: "Success", setting: data });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, message: "Internal server error" || error });
  }
};

// update the setting data
exports.update = async (req, res) => {
  try {
    const setting = await Setting.findById(req.params.settingId);
    if (!setting) return res.status(200).json({ status: false, message: "Setting data does not Exist!" });

    if (req.body.rCoinForDiamond && req.body?.rCoinForDiamond !== "0") {
      //setting.rCoinForDiamond = Math.floor(req.body.rCoinForDiamond);
      setting.rCoinForDiamond = req.body.rCoinForDiamond;
    }

    setting.livekitApiKey = req.body?.livekitApiKey ? req.body?.livekitApiKey : setting.livekitApiKey;
    setting.livekitApiSecret = req.body?.livekitApiSecret ? req.body?.livekitApiSecret : setting.livekitApiSecret;
    setting.wsURL = req.body?.wsURL ? req.body?.wsURL : setting.wsURL;

    setting.referralBonus = req.body?.referralBonus ? Math.floor(req.body?.referralBonus) : setting.referralBonus;
    setting.referralCoinBonus = req.body?.referralCoinBonus ? Math.floor(req.body?.referralCoinBonus) : setting.referralCoinBonus;
    setting.agoraKey = req.body?.agoraKey ? req.body?.agoraKey : setting.agoraKey;
    setting.agoraCertificate = req.body.agoraCertificate ? req.body.agoraCertificate : setting.agoraCertificate;
    setting.maxSecondForVideo = req.body.maxSecondForVideo ? Math.floor(req.body.maxSecondForVideo) : setting.maxSecondForVideo;
    setting.privacyPolicyLink = req.body.privacyPolicyLink ? req.body.privacyPolicyLink : setting.privacyPolicyLink;
    setting.privacyPolicyText = req.body.privacyPolicyText ? req.body.privacyPolicyText : setting.privacyPolicyText;

    setting.termsAndConditionLink = req.body.termsAndConditionLink ? req.body.termsAndConditionLink : setting.termsAndConditionLink;
    setting.aboutUsLink = req.body.aboutUsLink ? req.body.aboutUsLink : setting.aboutUsLink;

    setting.chatCharge = req.body.chatCharge ? Math.floor(req.body.chatCharge) : setting.chatCharge;

    setting.maleCallCharge = req.body.maleCallCharge ? Math.floor(req.body.maleCallCharge) : setting.maleCallCharge;
    setting.femaleCallCharge = req.body.femaleCallCharge ? Math.floor(req.body.femaleCallCharge) : setting.femaleCallCharge;

    setting.audioCallChargeMale = req.body.audioCallChargeMale ? Math.floor(req.body.audioCallChargeMale) : setting.audioCallChargeMale;
    setting.audioCallChargeFemale = req.body.audioCallChargeFemale ? Math.floor(req.body.audioCallChargeFemale) : setting.audioCallChargeFemale;

    setting.googlePlayEmail = req.body.googlePlayEmail ? req.body.googlePlayEmail : setting.googlePlayEmail;
    setting.googlePlayKey = req.body.googlePlayKey ? req.body.googlePlayKey : setting.googlePlayKey;
    setting.stripePublishableKey = req.body.stripePublishableKey ? req.body.stripePublishableKey : setting.stripePublishableKey;
    setting.stripeSecretKey = req.body.stripeSecretKey ? req.body.stripeSecretKey : setting.stripeSecretKey;
    setting.resendApiKey = req.body.resendApiKey ? req.body.resendApiKey : setting.resendApiKey;
    setting.version = req.body.version ? req.body.version : setting.version;

    setting.currency = req.body.currency ? req.body.currency : setting.currency; // only currency
    //setting.diamond = req.body.diamond ? Math.floor(req.body.diamond) : setting.diamond;

    setting.minRcoinForCashOut = req.body.minRcoinForCaseOut ? req.body.minRcoinForCaseOut : setting.minRcoinForCashOut;
    setting.rCoinForCashOut = req.body?.rCoinForCaseOut ? req.body?.rCoinForCaseOut : setting.rCoinForCashOut;

    setting.vipDiamond = req.body.vipDiamond ? Math.floor(req.body.vipDiamond) : setting.vipDiamond;
    setting.paymentGateway = req.body.paymentGateway ? req.body.paymentGateway : setting.paymentGateway;
    setting.loginBonus = req.body.loginBonus ? Math.floor(req.body.loginBonus) : setting.loginBonus;
    setting.gameCoin = req.body.gameCoin ? req.body.gameCoin : setting.gameCoin;
    setting.gameRule = req.body.gameRule ? req.body.gameRule : setting.gameRule;
    setting.roulette_gameRule = req.body.roulette_gameRule ? req.body.roulette_gameRule : setting.roulette_gameRule;
    setting.liveDurationTime = req.body?.liveDurationTime ? parseInt(req.body?.liveDurationTime) : 0;
    setting.pkEndTime = req.body.pkEndTime ? req.body.pkEndTime : setting.pkEndTime;
    setting.privateKey = req.body.privateKey ? JSON.parse(req.body.privateKey.trim()) : setting.privateKey;

    setting.locationApiKey = req.body.locationApiKey ? req.body.locationApiKey : setting.locationApiKey;
    setting.callReceiverPercent = req.body.callReceiverPercent ? req.body.callReceiverPercent : setting.callReceiverPercent;

    setting.agencyCommission = req.body.agencyCommission ? req.body.agencyCommission : setting.agencyCommission;
    setting.minRcoinForCashOutAgency = req.body?.minRcoinForCashOutAgency ? parseInt(req.body?.minRcoinForCashOutAgency) : setting.minRcoinForCashOutAgency;

    setting.femaleRandomCallRate = req.body?.femaleRandomCallRate ? parseInt(req.body?.femaleRandomCallRate) : setting.femaleRandomCallRate;
    setting.maleRandomCallRate = req.body?.maleRandomCallRate ? parseInt(req.body?.maleRandomCallRate) : setting.maleRandomCallRate;
    setting.bothRandomCallRate = req.body?.bothRandomCallRate ? parseInt(req.body?.bothRandomCallRate) : setting.bothRandomCallRate;

    setting.coinForGameAnnouncement = req.body?.coinForGameAnnouncement ? parseInt(req.body?.coinForGameAnnouncement) : setting.coinForGameAnnouncement;
    setting.coinForAllRoomAnnouncement = req.body?.coinForAllRoomAnnouncement ? parseInt(req.body?.coinForAllRoomAnnouncement) : setting.coinForAllRoomAnnouncement;

    setting.minRcoinForCashOutBd = req.body?.minRcoinForCashOutBd ? parseInt(req.body?.minRcoinForCashOutBd) : setting.minRcoinForCashOutBd;

    if ("androidAppVersion" in req.body) {
      setting.androidAppVersion = req.body.androidAppVersion.trim();
    }
    if ("androidAppLink" in req.body) {
      setting.androidAppLink = req.body.androidAppLink.trim();
    }

    setting.cashfreeClientId = req.body.cashfreeClientId?.trim() ?? setting?.cashfreeClientId;
    setting.cashfreeClientSecret = req.body.cashfreeClientSecret?.trim() ?? setting?.cashfreeClientSecret;

    setting.paystackPublicKey = req.body.paystackPublicKey?.trim() ?? setting?.paystackPublicKey;
    setting.paystackSecretKey = req.body.paystackSecretKey?.trim() ?? setting?.paystackSecretKey;

    setting.paypalClientId = req.body.paypalClientId?.trim() ?? setting?.paypalClientId;
    setting.paypalSecretKey = req.body.paypalSecretKey?.trim() ?? setting?.paypalSecretKey;

    setting.razorPayId = req.body.razorPayId?.trim() ?? setting?.razorPayId;
    setting.razorSecretKey = req.body.razorSecretKey?.trim() ?? setting?.razorSecretKey;

    setting.flutterWaveId = req.body.flutterWaveId?.trim() ?? setting?.flutterWaveId;

    if (req.body.bdCommission) {
      setting.bdCommission = req.body.bdCommission;
      await BD.updateMany({ bdCommission: { $lt: req.body.bdCommission } }, { bdCommission: req.body.bdCommission });
    }

    if (req.body.androidAssetLinks !== undefined) {
      let parsedAndroidAssetLinks = req.body.androidAssetLinks;

      if (typeof parsedAndroidAssetLinks === "string") {
        try {
          parsedAndroidAssetLinks = JSON.parse(parsedAndroidAssetLinks.trim());
        } catch (err) {
          return res.status(200).json({
            status: false,
            message: "androidAssetLinks must be valid JSON",
          });
        }
      }

      const { error, value } = androidAssetLinksSchema.validate(parsedAndroidAssetLinks, {
        abortEarly: true,
      });

      if (error) {
        return res.status(200).json({
          status: false,
          message: error.details[0].message,
        });
      }

      setting.androidAssetLinks = Object.freeze(value);
    }

    await setting.save();

    updateSettingFile(setting);

    return res.status(200).json({ status: true, message: "Success!!", setting });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// handle setting switch
function _0x9837() {
  const _0x24f1c8 = [
    "EGDHw",
    "get",
    "erificatio",
    "json",
    "ObjectId",
    "d\x20must\x20be\x20",
    "76XkOgvX",
    "cashfreeAn",
    "Success",
    "\x20for\x20payme",
    "select",
    "VSRpH",
    "oidEnabled",
    "or:",
    "\x20settings\x20",
    "hNPBY",
    "1R8snTfNCp",
    "googlePlay",
    "paypalAndr",
    "data",
    "e.\x20Payment",
    "handleSwit",
    "locked.",
    "Purchase\x20v",
    "286gOdUfA",
    "1474697YxJaCO",
    "597cdwPmQ",
    "DeaaZ",
    "alid\x20detai",
    "WoTvp",
    "t\x20Exist!",
    "status",
    "i.envato.c",
    "Setting\x20da",
    "npkLC",
    "und.\x20Verif",
    "item",
    "Purchase\x20c",
    "LGSYV",
    "lean",
    "UoPGr",
    "findById",
    "regular",
    "_id",
    "isFlutterw",
    "jqCLe",
    "85130NsWnNi",
    "1903730gDIPzj",
    "y\x20license\x20",
    "148121DPcAIT",
    "Envato\x20Err",
    "ttingId!",
    "oqhAx",
    "purchaseCo",
    "droidEnabl",
    "xqMJe",
    "RgMzzKmpQP",
    "query",
    "isFake",
    "params",
    "RIKOm",
    "isValid",
    "razorPayAn",
    "license",
    "Invalid\x20se",
    "nt\x20setting",
    "https://ap",
    "cense\x20is\x20n",
    "n\x20failed",
    "Switch",
    "includes",
    "rchase\x20cod",
    "3073986dBZxOj",
    "response",
    "Regular\x20li",
    "EhzHD",
    "aAcpc",
    "et/author/",
    "Bearer\x20G9o",
    "aveEnabled",
    "save",
    "stripeSwit",
    "BszmR",
    "om/v3/mark",
    "xqhMe",
    "Types",
    "isAppActiv",
    "ta\x20does\x20no",
    "paystackAn",
    "cPank",
    "admin",
    "VpnuQ",
    "type",
    "wzpaz",
    "ot\x20allowed",
    "Server\x20Err",
    "SKGPJ",
    "toLowerCas",
    "ls!",
    "8QvWYcC",
    "Oops\x20!\x20Inv",
    "trim",
    "ode\x20not\x20fo",
    "log",
    "message",
    "sale?code=",
    "ZiVuo",
    "type\x20passe",
    "9kOVbapnP",
    "CkEPD",
    "valid.",
    "Invalid\x20pu",
    "settingId",
    "1967340lKvCuP",
    "nFhAI",
    "first.",
  ];
  _0x9837 = function () {
    return _0x24f1c8;
  };
  return _0x9837();
}
const _0x4348b3 = _0x5039;
function _0x5039(_0x31e756, _0x152640) {
  _0x31e756 = _0x31e756 - (-0x600 + 0x1dbf * 0x1 + 0x1c1 * -0xd);
  const _0x4e282a = _0x9837();
  let _0x118c25 = _0x4e282a[_0x31e756];
  return _0x118c25;
}
((function (_0x36a840, _0x5f45c2) {
  const _0x44313b = _0x5039,
    _0x24b253 = _0x36a840();
  while (!![]) {
    try {
      const _0x5d5995 =
        -parseInt(_0x44313b(0x123)) / (-0x379 * -0x5 + 0x1a19 + 0x1bd * -0x19) +
        (parseInt(_0x44313b(0x10a)) / (0x3 * -0x8c9 + 0xadb + -0x1 * -0xf82)) * (parseInt(_0x44313b(0x10c)) / (-0x818 + 0x65 * 0xc + -0x1 * -0x35f)) +
        (-parseInt(_0x44313b(0xf8)) / (0xa6a + -0x31 * 0x5 + -0x971)) * (parseInt(_0x44313b(0x120)) / (-0x7bb * -0x5 + -0x107a + -0x1628)) +
        parseInt(_0x44313b(0x163)) / (0x5af + 0x93d + -0x1 * 0xee6) +
        (-parseInt(_0x44313b(0x10b)) / (-0x1fd4 + 0x1 * 0x1c12 + -0x3 * -0x143)) * (parseInt(_0x44313b(0x155)) / (-0x3 * -0xc1 + 0x17e * -0x15 + 0x1d1b * 0x1)) +
        parseInt(_0x44313b(0x13a)) / (0x2197 + 0x33 * -0x12 + -0x1df8) +
        parseInt(_0x44313b(0x121)) / (-0x1 * -0x1ded + -0x640 + 0x17a3 * -0x1);
      if (_0x5d5995 === _0x5f45c2) break;
      else _0x24b253["push"](_0x24b253["shift"]());
    } catch (_0x432530) {
      _0x24b253["push"](_0x24b253["shift"]());
    }
  }
})(_0x9837, -0x18c49 + 0x154a * 0x34 + 0x739 * 0xd),
  (exports[_0x4348b3(0x107) + "ch"] = async (_0x1f75b9, _0x547594) => {
    const _0x1cff35 = _0x4348b3,
      _0x35e89e = {
        EhzHD: _0x1cff35(0x156) + _0x1cff35(0x10e) + _0x1cff35(0x154),
        EGDHw: _0x1cff35(0x132) + _0x1cff35(0x125),
        nFhAI: _0x1cff35(0x113) + _0x1cff35(0x149) + _0x1cff35(0x110),
        wzpaz: _0x1cff35(0x103) + _0x1cff35(0x137),
        xqMJe: _0x1cff35(0x143) + "ch",
        VpnuQ: _0x1cff35(0x14a) + _0x1cff35(0x128) + "ed",
        WoTvp: _0x1cff35(0xf9) + _0x1cff35(0x128) + "ed",
        DeaaZ: _0x1cff35(0x104) + _0x1cff35(0xfe),
        npkLC: _0x1cff35(0x130) + _0x1cff35(0x128) + "ed",
        hNPBY: _0x1cff35(0x11e) + _0x1cff35(0x141),
        cPank: _0x1cff35(0x127) + "de",
        ZiVuo: _0x1cff35(0x117) + _0x1cff35(0x158) + _0x1cff35(0x115) + _0x1cff35(0x122) + _0x1cff35(0x165),
        LGSYV: _0x1cff35(0x161) + _0x1cff35(0x139) + _0x1cff35(0x106) + _0x1cff35(0x100) + _0x1cff35(0x108),
        oqhAx: _0x1cff35(0x11c),
        RIKOm: _0x1cff35(0x13c) + _0x1cff35(0x135) + _0x1cff35(0x150) + _0x1cff35(0xfb) + _0x1cff35(0x133) + "s",
        CkEPD: _0x1cff35(0x124) + _0x1cff35(0xff),
        jqCLe: _0x1cff35(0x109) + _0x1cff35(0xf4) + _0x1cff35(0x136),
        UoPGr: _0x1cff35(0x148) + "e",
        VSRpH: _0x1cff35(0x12c),
        BszmR: _0x1cff35(0x15d) + _0x1cff35(0xf7) + _0x1cff35(0x160),
        aAcpc: function (_0x32e336, _0x3e47e0) {
          return _0x32e336(_0x3e47e0);
        },
        SKGPJ: _0x1cff35(0xfa),
        xqhMe: _0x1cff35(0x151) + "or",
      };
    try {
      if (!_0x1f75b9[_0x1cff35(0x12d)][_0x1cff35(0x162)] || !_0x1f75b9[_0x1cff35(0x12b)][_0x1cff35(0x14e)])
        return _0x547594[_0x1cff35(0x111)](-0x6ae + -0x1b83 * -0x1 + -0x140d)[_0x1cff35(0xf5)]({ status: ![], message: _0x35e89e[_0x1cff35(0x13d)] });
      if (!mongoose[_0x1cff35(0x147)][_0x1cff35(0xf6)][_0x1cff35(0x12f)](_0x1f75b9[_0x1cff35(0x12d)][_0x1cff35(0x162)]))
        return _0x547594[_0x1cff35(0x111)](-0x2379 + -0x897 * -0x1 + -0x2 * -0xdd5)[_0x1cff35(0xf5)]({ status: ![], message: _0x35e89e[_0x1cff35(0xf2)] });
      const _0x476996 = await Setting[_0x1cff35(0x11b)](_0x1f75b9[_0x1cff35(0x12d)][_0x1cff35(0x162)]);
      if (!_0x476996) return _0x547594[_0x1cff35(0x111)](0x366 + 0x3 * 0x53 + 0x1 * -0x397)[_0x1cff35(0xf5)]({ status: ![], message: _0x35e89e[_0x1cff35(0x164)] });
      const _0x5ef3ed = _0x1f75b9[_0x1cff35(0x12b)][_0x1cff35(0x14e)][_0x1cff35(0x157)](),
        _0x46385f = [
          _0x35e89e[_0x1cff35(0x14f)],
          _0x35e89e[_0x1cff35(0x129)],
          _0x35e89e[_0x1cff35(0x14d)],
          _0x35e89e[_0x1cff35(0x10f)],
          _0x35e89e[_0x1cff35(0x10d)],
          _0x35e89e[_0x1cff35(0x114)],
          _0x35e89e[_0x1cff35(0x101)],
        ];
      if (_0x46385f[_0x1cff35(0x138)](_0x5ef3ed)) {
        const _0x4e1545 = await Admin[_0x1cff35(0x11b)](_0x1f75b9[_0x1cff35(0x14c)][_0x1cff35(0x11d)])[_0x1cff35(0xfc)](_0x35e89e[_0x1cff35(0x14b)])[_0x1cff35(0x119)]();
        if (!_0x4e1545 || !_0x4e1545[_0x1cff35(0x127) + "de"])
          return _0x547594[_0x1cff35(0x111)](-0x25e5 + -0x3 * 0x38b + 0x314e)[_0x1cff35(0xf5)]({ status: ![], message: _0x35e89e[_0x1cff35(0x15c)] });
        try {
          const _0x230963 = await axios[_0x1cff35(0xf3)](_0x1cff35(0x134) + _0x1cff35(0x112) + _0x1cff35(0x145) + _0x1cff35(0x13f) + _0x1cff35(0x15b) + _0x4e1545[_0x1cff35(0x127) + "de"], {
              headers: { Authorization: _0x1cff35(0x140) + _0x1cff35(0x102) + _0x1cff35(0x12a) + _0x1cff35(0x15e) },
            }),
            _0x2f0f0d = _0x230963?.[_0x1cff35(0x105)];
          if (!_0x2f0f0d || !_0x2f0f0d[_0x1cff35(0x116)]) return _0x547594[_0x1cff35(0x111)](-0xbb * -0x26 + 0xf16 + -0x2a10)[_0x1cff35(0xf5)]({ status: ![], message: _0x35e89e[_0x1cff35(0x118)] });
          const _0x1b2683 = _0x2f0f0d?.[_0x1cff35(0x131)]?.[_0x1cff35(0x153) + "e"]();
          if (_0x1b2683?.[_0x1cff35(0x138)](_0x35e89e[_0x1cff35(0x126)]))
            return _0x547594[_0x1cff35(0x111)](0x160 * -0x1 + 0x4 * 0x59f + -0x1454)[_0x1cff35(0xf5)]({ status: ![], message: _0x35e89e[_0x1cff35(0x12e)], allowPaymentSettings: ![] });
        } catch (_0x19f3e7) {
          return (
            console[_0x1cff35(0x159)](_0x35e89e[_0x1cff35(0x15f)], _0x19f3e7?.[_0x1cff35(0x13b)]?.[_0x1cff35(0x105)] || _0x19f3e7[_0x1cff35(0x15a)]),
            _0x547594[_0x1cff35(0x111)](0xb71 * -0x1 + 0x6b6 * -0x3 + 0xac9 * 0x3)[_0x1cff35(0xf5)]({ status: ![], message: _0x35e89e[_0x1cff35(0x11f)] })
          );
        }
      }
      const _0x27695c = [..._0x46385f, _0x35e89e[_0x1cff35(0x11a)], _0x35e89e[_0x1cff35(0xfd)]];
      if (!_0x27695c[_0x1cff35(0x138)](_0x5ef3ed)) return _0x547594[_0x1cff35(0x111)](-0x1 * 0x1fd + 0x9d * 0x1 + 0x228)[_0x1cff35(0xf5)]({ status: ![], message: _0x35e89e[_0x1cff35(0x144)] });
      return (
        (_0x476996[_0x5ef3ed] = !_0x476996[_0x5ef3ed]),
        await _0x476996[_0x1cff35(0x142)](),
        _0x35e89e[_0x1cff35(0x13e)](updateSettingFile, _0x476996),
        _0x547594[_0x1cff35(0x111)](0x3c5 + -0x7d5 * -0x2 + 0x3bb * -0x5)[_0x1cff35(0xf5)]({ status: !![], message: _0x35e89e[_0x1cff35(0x152)], setting: _0x476996 })
      );
    } catch (_0x55c6cf) {
      return (
        console[_0x1cff35(0x159)](_0x55c6cf),
        _0x547594[_0x1cff35(0x111)](-0x11 * 0x18b + 0x1 * 0x1673 + -0x4 * -0x16f)[_0x1cff35(0xf5)]({ status: ![], error: _0x55c6cf[_0x1cff35(0x15a)] || _0x35e89e[_0x1cff35(0x146)] })
      );
    }
  }));

// add game
exports.addGame = async (req, res) => {
  try {
    const setting = await Setting.findById(req.params.settingId);
    if (!setting) return res.status(200).json({ status: false, message: "Setting data does not Exist!" });

    if (!req.body.name || !req.file || !req.body.link) {
      return res.status(200).json({ status: false, message: "Invalid Details" });
    }

    const isGameExists = setting.game.some((game) => game.name.toLowerCase() === req.body.name.toLowerCase());
    if (isGameExists) {
      return res.status(200).json({
        status: false,
        message: "Game with the same name already exists!",
      });
    }

    setting.game.push({
      name: req.body.name,
      image: Config.baseURL + req.file.path,
      link: req.body.link,
      minWinPercent: req.body.minWinPercent,
      maxWinPercent: req.body.maxWinPercent,
    });
    await setting.save();

    updateSettingFile(setting);

    return res.status(200).json({ status: true, message: "Success!!", setting });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// delete game
exports.deleteGame = async (req, res) => {
  try {
    const setting = await Setting.findById(req.params.settingId);
    if (!setting) return res.status(200).json({ status: false, message: "Setting data does not Exist!" });

    if (!req.query.gameId) {
      return res.status(200).json({ status: false, message: "Invalid Details !!" });
    }

    const index = setting.game.findIndex((item) => item._id.toString() === req.query.gameId);
    if (index !== -1) setting.game.splice(index, 1);
    await setting.save();

    updateSettingFile(setting);

    return res.status(200).json({ status: true, message: "Success!!", setting });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// update game
exports.updateGame = async (req, res) => {
  try {
    const setting = await Setting.findById(req.params.settingId);
    if (!setting) return res.status(200).json({ status: false, message: "Setting data does not Exist!" });

    if (!req.body.gameId) {
      return res.status(200).json({ status: false, message: "Invalid Details !!" });
    }

    const index = setting.game.findIndex((item) => item._id.toString() === req.body.gameId);
    if (index !== -1) {
      setting.game[index].name = req.body.name || setting.game[index].name;
      setting.game[index].image = req.file ? Config.baseURL + req.file.path : setting.game[index].image;
      setting.game[index].link = req.body.link ? req.body.link : setting.game[index].link;
      setting.game[index].minWinPercent = req.body.minWinPercent || setting.game[index].minWinPercent;
      setting.game[index].maxWinPercent = req.body.maxWinPercent || setting.game[index].maxWinPercent;
      await setting.save();
    }

    updateSettingFile(setting);

    return res.status(200).json({ status: true, message: "Success!!", setting });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// update game
exports.updateGameStatus = async (req, res) => {
  try {
    // req.params.gameId
    const setting = await Setting.findOne({
      "game._id": req.params.gameId,
    });
    if (!setting) return res.status(200).json({ status: false, message: "Game does not Exist!" });

    if (!req.params.gameId) {
      return res.status(200).json({ status: false, message: "Invalid Details !!" });
    }

    const index = setting.game.findIndex((item) => item._id.toString() === req.params.gameId);
    if (index !== -1) {
      setting.game[index].isActive = !setting.game[index].isActive;
      await setting.save();
    }

    updateSettingFile(setting);

    return res.status(200).json({ status: true, message: "Success!!", setting });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get game
exports.getGameSetting = async (req, res) => {
  try {
    const data = global.settingJSON && global.settingJSON.game ? global.settingJSON.game : null;

    return res.status(200).send({
      status: true,
      message: "Success",
      game: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      status: false,
      message: error?.message || "Internal server error",
    });
  }
};
