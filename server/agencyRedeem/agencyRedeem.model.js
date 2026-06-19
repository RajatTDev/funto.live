const mongoose = require("mongoose");
const moment = require("moment");
const agencyRedeemSchema = new mongoose.Schema(
  {
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", default: null },
    paymentGateway: String,
    description: String,
    rCoin: Number,
    amount: { type: Number, default: 0 }, //rcoin coverted into amount by setting's rCoinForCaseOut whichever currency
    reason: { type: String, default: "" },

    status: { type: Number, default: 1, enum: [ 1, 2, 3] }, // 1: pending, 2: accepted, 3: decline
    date: { type: String, default: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
    acceptDeclineDate: { type: String, default: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
    month:{type:String,default:moment().format('YYYY-MM')},
    bankDetails: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

agencyRedeemSchema.index({ agency: 1 });
agencyRedeemSchema.index({ bd: 1 });
agencyRedeemSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AgencyRedeem", agencyRedeemSchema);
