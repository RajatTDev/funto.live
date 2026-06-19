const mongoose = require("mongoose");

const pkGiftHistorySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    liveStreamingId: { type: mongoose.Schema.Types.ObjectId, ref: "LiveStreamingHistory" },
    giftId: { type: mongoose.Schema.Types.ObjectId, ref: "Gift" },
    coin: { type: Number, default: 0 },
    date: String,
  },
  { timestamps: true, versionKey: false }
);

pkGiftHistorySchema.index({ userId: 1 });
pkGiftHistorySchema.index({ liveStreamingId: 1 });

module.exports = mongoose.model("PkGiftHistory", pkGiftHistorySchema);
