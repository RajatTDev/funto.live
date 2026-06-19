const mongoose = require("mongoose");

const coinSellerSchema = new mongoose.Schema(
  {
    mobileNumber: { type: String, default: "" },
    countryCode: { type: String, default: "" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    uniqueId: { type: Number }, //uniqueId of the user
    coin: { type: Number, default: 0 }, //balancing coin of coinseller
    spendCoin: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDelete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

coinSellerSchema.index({ user: 1 });
coinSellerSchema.index({ isActive: 1 });

module.exports = mongoose.model("CoinSeller", coinSellerSchema);
