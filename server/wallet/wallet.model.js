const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    otherUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", default: null },

    parentAgencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", default: null },
    parentBdId: { type: mongoose.Schema.Types.ObjectId, ref: "Bd", default: null },

    bdId: { type: mongoose.Schema.Types.ObjectId, ref: "Bd", default: null },
    otherAgencyId: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", default: null },

    type: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    },
    //0:gift, 1:convert, 2:purchase [diamond purchase], 3:video call, 4:ad[from watching ad], 5:login bonus, 6:referral bonus, 7:cashOut, 8:admin [admin add or less the rCoin or diamond through admin panel],
    //9:svga, 10:teenPatti, 11:avatarFrame, 12:Coinseller, 13: call coin receive according to receiver share, 15:Roulette_game, 16:ferryWheelGame, 17:agencyCommission, 18:chat gift, 19:video call gift, 20:audio call, 21:bdCommission, 22:BD Redeemed coins
    //23: admin added coins to bd, 24: admin deducted coins from bd

    diamond: { type: Number, default: null },
    rCoin: { type: Number, default: null },
    isIncome: { type: Boolean, default: true },

    planId: { type: mongoose.Schema.Types.ObjectId, ref: "CoinPlan", default: null },
    paymentGateway: { type: String, default: null },

    svgaId: { type: mongoose.Schema.Types.ObjectId, ref: "Svga", default: null },
    avatarFrameId: { type: mongoose.Schema.Types.ObjectId, ref: "AvatarFrame", default: null },

    //this field for call
    callConnect: { type: Boolean, default: false },
    callStartTime: { type: String, default: null },
    callEndTime: { type: String, default: null },
    callType: { type: String, default: null },

    rouletteGame: {},

    isPkMode: { type: Boolean, default: false },
    isAudio: { type: Boolean, default: false },

    date: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

walletSchema.index({ svgaId: 1 });
walletSchema.index({ avatarFrameId: 1 });
walletSchema.index({ userId: 1 });
walletSchema.index({ type: 1 });
walletSchema.index({ diamond: 1 });
walletSchema.index({ rCoin: 1 });
walletSchema.index({ otherUserId: 1 });
walletSchema.index({ isIncome: 1 });
walletSchema.index({ callConnect: 1 });
walletSchema.index({ bdId: 1 });

module.exports = mongoose.model("Wallet", walletSchema);
