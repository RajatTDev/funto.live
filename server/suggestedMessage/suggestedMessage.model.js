const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SuggestedMessageSchema = new Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("SuggestedMessage", SuggestedMessageSchema);
