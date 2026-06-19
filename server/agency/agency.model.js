const mongoose = require("mongoose");

const agencySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, //_id of the user who become agent
    bd: { type: mongoose.Schema.Types.ObjectId, ref: "Bd", default: null }, //_id of the BD this agency belongs to
    bankDetails: { type: String, default: "" },
    name: String,
    image: String,
    agencyCode: { type: Number, unique: true },
    uniqueId: { type: Number }, //uniqueId of the user
    mobile: { type: String },

    totalWithdrawnCoin: { type: Number, default: 0 },
    pendingWithdrawableRequestCoin: { type: Number, default: 0 },
    redeemEnable: { type: Boolean, default: true },

    rCoin: { type: Number, default: 0 }, //  commission of agency in wallet
    currentCoin: { type: Number, default: 0 }, // current commission of agency
    currentHostCoin: { type: Number, default: 0 }, //update in real time when host under this agency earn

    totalCoin: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },

    loginString: { type: String, default: "", unique: true },
    isDemo: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

agencySchema.index({ isActive: 1 });
agencySchema.index({ uniqueId: 1 });
agencySchema.index({ user: 1 });
agencySchema.index({ createdAt: -1 });

module.exports = mongoose.model("Agency", agencySchema);
