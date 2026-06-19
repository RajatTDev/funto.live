const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    svga: { type: mongoose.Schema.Types.ObjectId, ref: "Svga" },
    frame: { type: mongoose.Schema.Types.ObjectId, ref: "AvatarFrame" },
    time: Date,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);
purchaseSchema.index({ userId: 1 });
purchaseSchema.index({ time: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("Purchase", purchaseSchema);
