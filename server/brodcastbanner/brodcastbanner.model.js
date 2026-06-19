const mongoose = require("mongoose");

const bannerSchema = new mongoose.Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    redirectUrl: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    bannerType: { type: Number, enum: [0, 1, 2], default: 0 }, //1.gift 2.game
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

bannerSchema.index({ createdAt: -1 });

module.exports = mongoose.model("BrodcastBanner", bannerSchema);
