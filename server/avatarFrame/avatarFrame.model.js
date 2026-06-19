const mongoose = require("mongoose");

const AvatarFrameSchema = new mongoose.Schema(
  {
    image: String,
    diamond: Number,
    name: String,
    validity: Number,
    validityType: String,
    validationTag: String,
    isDelete: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AvatarFrameSchema.index({ isDelete: 1 });

module.exports = mongoose.model("AvatarFrame", AvatarFrameSchema);
