const mongoose = require("mongoose");

const chatSchema = mongoose.Schema(
  {
    topic: { type: mongoose.Schema.Types.ObjectId, ref: "ChatTopic" },
    senderId: String,
    messageType: String,
    message: String,
    image: { type: String, default: null },
    giftImage: { type: String, default: null },
    giftsvgaImage: { type: String, default: null },
    giftType: { type: Number, default: 0 },
    giftCount: { type: Number, default: 0 },
    isRead: { type: Boolean, default: false },
    date: String,

    callId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true
    },
    callType: {
      type: Number,
      enum: [1, 2] // 1. audio 2. video
    },
    callDuration: {
      type: String,
      default: "00:00:00"
    },
    callStatus: {
      type: Number,
      enum: [1, 2, 3] // 1. Recieved 2. Declined 3. Missed
    },
    callerId: {type: mongoose.Schema.Types.ObjectId},
    receiverId: {type: mongoose.Schema.Types.ObjectId},
    callerCoinCharged: {
      type: Number,
      default: 0
    },
    receiverCoinEarned: {
      type: Number,
      default: 0
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

chatSchema.index({ topic: 1 });

module.exports = mongoose.model("Chat", chatSchema);
