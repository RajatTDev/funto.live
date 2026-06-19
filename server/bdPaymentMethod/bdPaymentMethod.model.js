const mongoose = require("mongoose");

const bdPaymentMethodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., bKash, Nagad, Rocket
    details: { type: Object, required: true }, // mandatory
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("BDPaymentMethod", bdPaymentMethodSchema);