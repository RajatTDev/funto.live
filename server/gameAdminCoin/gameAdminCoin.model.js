const mongoose = require("mongoose");

const GameAdminCoinSchema = new mongoose.Schema({
  coin: { type: Number, required: true, default: 0 },
  totalCoin: Number,
});

const GameAdminCoin = mongoose.model("GameAdminCoin", GameAdminCoinSchema);

module.exports = GameAdminCoin;
