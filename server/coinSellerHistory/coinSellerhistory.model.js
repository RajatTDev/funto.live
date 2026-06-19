const mongoose = require("mongoose");

const coinSellerHistorySchema = new mongoose.Schema(
  {
    coinSeller: { type: mongoose.Schema.Types.ObjectId, ref: "CoinSeller", default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, //_id of user who purchased coin from coinSeller
    coin: { type: Number, default: 0 },
    isIncome: { type: Boolean, default: false },
    date: { type: String, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

coinSellerHistorySchema.index({ coinSeller: 1 });
coinSellerHistorySchema.index({ user: 1 });
coinSellerHistorySchema.index({ isIncome: 1 });

module.exports = mongoose.model("CoinSellerHistory", coinSellerHistorySchema);
