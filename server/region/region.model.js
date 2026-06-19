const mongoose = require("mongoose");

const regionSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

regionSchema.index({ name: 1 });
regionSchema.index({ isActive: 1 });
regionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Region", regionSchema);
