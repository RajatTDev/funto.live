const mongoose = require("mongoose");

const bdRedeemSchema = new mongoose.Schema(
  {
    bd: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bd",
      required: true,
      index: true
    },

    rCoin: {
      type: Number,
      required: true,
      min: 1
    },

    amount: {
      type: Number,
      required: true
    },

    paymentGateway: { type: String, default: "" },
    paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    reason: {
      type: String,
      default: ""
    },

    transactionId: {
      type: String,
      default: ""
    },

    processedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

bdRedeemSchema.index({ bd: 1, createdAt: -1 });
bdRedeemSchema.index({ status: 1 });

module.exports = mongoose.model("BdRedeem", bdRedeemSchema);