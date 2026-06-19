const mongoose = require("mongoose");

const hostRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, default: "" },
    bankDetails: { type: String, default: "" },
    bio: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    agencyCode: { type: String, default: "" },
    document: { type: String, default: "" }, //verification document proof
    date: { type: String, default: "" },
    mobile: { type: String, default: "" },
    type: { type: Number, default: 1, enum: [1, 2] },
    status: { type: Number, default: 1, enum: [1, 2, 3] }, //1.pending 2.accepted 3.declined
    reason: { type: String, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

hostRequestSchema.index({ createdAt: 1 });
hostRequestSchema.index({ user: 1 });

module.exports = mongoose.model("HostRequest", hostRequestSchema);
