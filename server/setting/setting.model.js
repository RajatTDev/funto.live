const mongoose = require("mongoose");

const gameItemSchema = new mongoose.Schema(
  {
    name: { type: String, default: "NAME" },
    image: { type: String, default: "IMAGE" },
    link: { type: String, default: "LINK" },
    isActive: { type: Boolean, default: true },
    minWinPercent: { type: Number, default: 25 },
    maxWinPercent: { type: Number, default: 120 },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const settingSchema = new mongoose.Schema(
  {
    referralBonus: { type: Number, default: 50 }, //diamond
    referralCoinBonus: { type: Number, default: 50 }, //coin

    loginBonus: { type: Number, default: 50 },
    maxSecondForVideo: { type: Number, default: 30 },

    livekitApiKey: { type: String, default: "" },
    livekitApiSecret: { type: String, default: "" },
    wsURL: { type: String, default: "" },

    agoraKey: { type: String, default: "AGORA KEY" },
    agoraCertificate: { type: String, default: "AGORA CERTIFICATE" },

    privacyPolicyLink: { type: String, default: "PRIVACY POLICY LINK" },
    termsAndConditionLink: { type: String, default: "https://example.com/terms" },
    aboutUsLink: { type: String, default: "https://example.com/about" },

    privacyPolicyText: { type: String, default: "PRIVACY POLICY TEXT" },

    chatCharge: { type: Number, default: 10 },

    //private video call charge
    maleCallCharge: { type: Number, default: 10 },
    femaleCallCharge: { type: Number, default: 10 },

    //private audio call charge
    audioCallChargeMale: { type: Number, default: 10 },
    audioCallChargeFemale: { type: Number, default: 10 },

    //random call charge
    femaleRandomCallRate: { type: Number, default: 10 },
    maleRandomCallRate: { type: Number, default: 10 },
    bothRandomCallRate: { type: Number, default: 10 },

    googlePlayEmail: { type: String, default: "GOOGLE PLAY EMAIL" },
    googlePlayKey: { type: String, default: "GOOGLE PLAY KEY" },
    googlePlaySwitch: { type: Boolean, default: false },

    stripeSwitch: { type: Boolean, default: false },
    stripePublishableKey: { type: String, default: "STRIPE PUBLISHABLE KEY" },
    stripeSecretKey: { type: String, default: "STRIPE SECRET KEY" },

    vipDiamond: { type: Number, default: 20 },

    resendApiKey: { type: String, default: "RESEND API KEY" },

    minRcoinForCashOut: { type: Number, default: 200 }, // minimum rCoin for withdraw [user redeem]

    rCoinForCashOut: { type: Number, default: 20 }, // coin trf to cash
    rCoinForDiamond: { type: Number, default: 20 }, // diamond trf to coin

    isFake: { type: Boolean, default: false },
    isAppActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    paymentGateway: { type: Array, default: [] },
    freeDiamondForAd: { type: Number, default: 20 },
    maxAdPerDay: { type: Number, default: 3 },
    liveDurationTime: { type: Number, default: 0 },
    gameCoin: { type: Array, default: [100, 200, 500, 1000, 2000] },
    gameRule: { type: String, default: "GAME RULE" },
    roulette_gameRule: { type: String, default: "roulette_gameRule" },
    pkEndTime: { type: Number, default: 0 },
    game: [gameItemSchema],
    privateKey: { type: Object, default: {} }, //firebase.json handle notification

    agencyCommission: { type: Number, default: 15 },
    minRcoinForCashOutAgency: { type: Number, default: 500 },
    locationApiKey: { type: String, default: "LOCATION API KEY" },
    callReceiverPercent: { type: Number, default: 0 }, //coin earn by call receiver

    bdCommission: { type: Number, default: 10 },
    minRcoinForCashOutBd: { type: Number, default: 500 },

    androidAppVersion: { type: String, default: "" },
    androidAppLink: { type: String, default: "" },

    paystackAndroidEnabled: { type: Boolean, default: false },
    paystackPublicKey: { type: String, default: "PAYSTACK PUBLIC KEY" },
    paystackSecretKey: { type: String, default: "PAYSTACK SECRET KEY" },

    cashfreeAndroidEnabled: { type: Boolean, default: false },
    cashfreeClientId: { type: String, default: "CASHFREE CLIENT ID" },
    cashfreeClientSecret: { type: String, default: "CASHFREE CLIENT SECRET" },

    paypalAndroidEnabled: { type: Boolean, default: false },
    paypalClientId: { type: String, default: "PAYPAL CLIENT ID" },
    paypalSecretKey: { type: String, default: "PAYPAL SECRET KEY" },

    razorPayAndroidEnabled: { type: Boolean, default: false },
    razorPayId: { type: String, default: "RAZOR PAY ID" },
    razorSecretKey: { type: String, default: "RAZOR SECRET KEY" },

    isFlutterwaveEnabled: { type: Boolean, default: false },
    flutterWaveId: { type: String, default: "FLUTTER WAVE ID" },

    currency: {
      name: { type: String, default: "", unique: true },
      symbol: { type: String, default: "", unique: true },
      countryCode: { type: String, default: "" },
      currencyCode: { type: String, default: "" },
      isDefault: { type: Boolean, default: false },
    },

    coinForAllRoomAnnouncement: { type: Number, default: 0 }, // ( gift banner )
    coinForGameAnnouncement: { type: Number, default: 0 }, // ( game banner )

    androidAssetLinks: { type: Array, default: [] },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

module.exports = mongoose.model("Setting", settingSchema);
