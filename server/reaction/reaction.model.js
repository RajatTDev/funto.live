const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    image: String,
    name: String,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

reactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Reaction", reactionSchema);
