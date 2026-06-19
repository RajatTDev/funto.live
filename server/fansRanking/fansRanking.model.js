const mongoose = require("mongoose");

const fansRankingSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, //userId (who is live) consider as roomId
    isPkMode: { type: Boolean, default: false },
    isAudio: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    otherUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    diamond: { type: Number, default: 0 },
    type: { type: Number, default: 0 },
    isIncome: { type: Boolean, default: true },
    date: { type: String, default: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }) },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

fansRankingSchema.index({ roomId: 1 });

module.exports = mongoose.model("FansRanking", fansRankingSchema);
