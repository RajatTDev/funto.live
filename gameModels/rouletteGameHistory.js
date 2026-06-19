const mongoose = require("mongoose");

const RouletteGameHistorySchema = new mongoose.Schema(
  {
    cardCoin: {
      type: Array,
      default: 0,
    },
    date: {
      type: String,
      default: "",
    },
    winnerObj: {},
    updatedAdminCoin: { type: Number, default: 0 },
    winnerCoinMinus: { type: Number, default: 0 },
    totalAdd: { type: Number, default: 0 },
  },

  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model(
  "RouletteGameHistory",
  RouletteGameHistorySchema
);
