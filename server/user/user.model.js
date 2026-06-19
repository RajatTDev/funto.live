const mongoose = require("mongoose");
const config = require("../../config");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    username: { type: String, default: "" },
    gender: { type: String, default: "" },
    age: { type: Number, default: 0 },
    email: String,

    roomName: { type: String, default: "" },
    roomWelcome: { type: String, default: "" },
    roomImage: { type: String, default: "" },

    fakeDataType: { type: Number, enum: [0, 1, 2] }, //0: fakeLiveVideo, 1: fakePkLiveVideo, 2: fakeAudioLive
    linkType: { type: Number, default: 0 }, //0: Link , 1: file
    imageType: { type: Number, default: 0 }, //0: Link, 1: file

    countryFlagImage: { type: String, default: "" },
    image: { type: String, default: `${config.baseURL}storage/female.png` },
    coverImage: { type: String, default: `${config.baseURL}storage/coverImage.png` },
    link: { type: String, default: "" },

    pkImageArray: { type: Array, default: [] },
    pkVideoArray: { type: Array, default: [] },

    video: { type: Number, default: 0 },
    post: { type: Number, default: 0 },

    country: String,
    uniqueId: Number,
    ip: String,
    identity: String,
    referralCode: String,
    lastLogin: String,
    fcmToken: { type: String, default: null },
    analyticDate: String,
    callId: String,
    gameBlock: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    isFake: { type: Boolean, default: false },
    isDemo: { type: Boolean, default: false },
    isBusy: { type: Boolean, default: false },
    token: { type: String, default: null },
    channel: { type: String, default: null },

    isBlock: { type: Boolean, default: false },

    isReferral: { type: Boolean, default: false },
    referralCount: { type: Number, default: 0 },

    bio: { type: String, default: null },

    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },

    level: { type: mongoose.Schema.Types.ObjectId, ref: "Level", default: null },
    liveJoinSvga: { type: mongoose.Schema.Types.ObjectId, ref: "Svga", default: null },
    avatarFrame: { type: mongoose.Schema.Types.ObjectId, ref: "AvatarFrame", default: null },
    avatarFrameImage: { type: String, default: "" },

    enableToLive: { type: Boolean, default: true },

    diamond: { type: Number, default: 0 },
    rCoin: { type: Number, default: 0 },

    withdrawalRcoin: { type: Number, default: 0 },
    spentCoin: { type: Number, default: 0 },
    currentCoin: { type: Number, default: 0 },

    loginType: { type: Number, enum: [0, 1, 2, 3], default: 0 }, //0:google 2:quick 3:fake

    notification: {
      newFollow: { type: Boolean, default: true },
      favoriteLive: { type: Boolean, default: true },
      likeCommentShare: { type: Boolean, default: true },
      message: { type: Boolean, default: true },
    },

    isVIP: { type: Boolean, default: false },

    bankDetails: { type: String, default: "" }, //only for host
    isHost: { type: Boolean, default: false },
    hostAgency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", default: null },
    hostLoginString: { type: String, default: "" },

    isAgency: { type: Boolean, default: false },
    agency: { type: mongoose.Schema.Types.ObjectId, ref: "Agency", default: null },
    agencyLoginString: { type: String },

    isBd: { type: Boolean, default: false },
    bd: { type: mongoose.Schema.Types.ObjectId, ref: "Bd", default: null },
    bdLoginString: { type: String, default: "" },

    isCoinSeller: { type: Boolean, default: false },

    plan: {
      planStartDate: { type: String, default: null }, // VIP plan start date
      planId: { type: mongoose.Schema.Types.ObjectId, default: null },
    },

    ad: {
      count: { type: Number, default: 0 },
      date: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ uniqueId: 1 });
userSchema.index({ channel: 1 });
userSchema.index({ country: 1 });
userSchema.index({ isFake: 1 });
userSchema.index({ identity: 1 });
userSchema.index({ callId: 1 });
userSchema.index({ isBlock: 1 });

module.exports = mongoose.model("User", userSchema);
