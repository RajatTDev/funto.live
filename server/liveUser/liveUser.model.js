const mongoose = require("mongoose");
const seat = require("../../util/defaultSeat");

const liveUserSchema = new mongoose.Schema(
  {
    name: String,
    country: String,
    image: String,
    avatarFrameImage: String,
    age: Number,
    token: String,
    channel: String,
    diamond: Number,
    username: String,
    isVIP: Boolean,
    uniqueId: Number,
    countryFlagImage: String,

    rCoin: { type: Number, default: 0 }, //liveRoom's coin

    background: { type: String, default: `` },
    view: { type: Array, default: [] },
    time: { type: Number, default: 0 },
    liveUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    liveStreamingId: { type: mongoose.Schema.Types.ObjectId, ref: "livestreaminghistories" },
    continueLive: { type: Boolean, default: false },

    isPublic: { type: Boolean, default: true },
    agoraUID: { type: Number, default: 0 },
    filter: { type: String, default: "" },

    audioConfig: {
      isHostMute: { type: Number, default: 0 },
    },
    isHostExists: { type: Boolean, default: false },
    privateCode: { type: Number, default: 0 }, //max 4 digit
    roomName: { type: String, default: "" },
    roomWelcome: { type: String, default: "" },
    roomImage: { type: String, default: "" },
    audio: { type: Boolean, default: false },
    seat: {
      type: [
        {
          position: { type: Number },
          mute: { type: Number, enum: [0, 1, 2], default: 0 },
          lock: { type: Boolean },
          isSpeaking: { type: Boolean },
          reserved: { type: Boolean },
          invite: { type: Boolean },
          avatarFrameImage: { type: String },
          userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          name: { type: String },
          image: { type: String },
          country: { type: String },
          agoraUid: { type: Number },
        },
      ],
      default: seat.default,
    },

    blockedUsers: [
      {
        blockedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      },
    ],

    expiration_date: { type: Date, expires: 0 }, //for liveUsers deleted after 30 min of when user is live (except audio live)
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

liveUserSchema.index({ liveUserId: 1 });
liveUserSchema.index({ liveStreamingId: 1 });

module.exports = mongoose.model("LiveUser", liveUserSchema);
