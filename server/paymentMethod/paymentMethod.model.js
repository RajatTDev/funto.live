const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., UPI, Paytm, Bank
    details: { type: Object, default: {} },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);
