const Wallet = require("./wallet.model");
const User = require("../user/user.model");
const Agency = require("../agency/agency.model");
const GameAdminCoin = require("../gameAdminCoin/gameAdminCoin.model");
const TeenPattiHistory = require("../../gameModels/teenPattiHistory");
const RouletteCasinoHistory = require("../../gameModels/rouletteGameHistory");
const FerryWheelHistory = require("../../gameModels/ferryWheelGameHistory");
const Block = require("../block/block.model");

const mongoose = require("mongoose");

const LiveStreamingHistory = require("../liveStreamingHistory/liveStreamingHistory.model");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

const moment = require("moment");

//private key
const admin = require("../../util/privateKey");

const addFieldQuery = {
  analyticDate: { $arrayElemAt: [{ $split: ["$date", ", "] }, 0] },
};

// get free diamond from watching ad
exports.getDiamondFromAd = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId).populate("level liveJoinSvga avatarFrame");

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "Setting data not Found!" });
    }

    if (
      user.ad &&
      user.ad.date !== null &&
      user.ad.date.split(",")[0] ===
        new Date()
          .toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          })
          .split(",")[0] &&
      user.ad.count >= settingJSON.maxAdPerDay
    ) {
      return res.status(200).json({ status: false, message: "You exceed your Ad limit." });
    }

    user.diamond += settingJSON ? settingJSON.freeDiamondForAd : 0;
    user.ad.count += 1;
    user.ad.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    const income = new Wallet();
    income.userId = user._id;
    income.diamond = settingJSON ? settingJSON.freeDiamondForAd : 0;
    income.type = 4;
    income.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    await Promise.all([user.save(), income.save()]);

    return res.status(200).json({ status: true, message: "Success!", user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// convert rCoin to diamond
exports.convertRcoinToDiamond = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.rCoin) return res.status(200).json({ status: false, message: "Invalid Details!!" });

    const user = await User.findById(req.body.userId).populate("level liveJoinSvga avatarFrame");

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!", user: {} });

    if (req.body.rCoin > user.rCoin)
      return res.status(200).json({
        status: false,
        message: "Not enough coin for conversion!",
        user: "",
      });

    if (!settingJSON)
      return res.status(200).json({
        status: false,
        message: "Setting data not Found!",
        user: null,
      });

    user.rCoin -= req.body.rCoin;
    user.diamond += parseInt(req.body.rCoin / settingJSON.rCoinForDiamond);
    let data = [
      {
        userId: user._id,
        diamond: parseInt(req.body.rCoin / settingJSON.rCoinForDiamond),
        type: 1,
        isIncome: true,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      },
      {
        userId: user._id,
        rCoin: req.body.rCoin,
        type: 1,
        isIncome: false,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      },
    ];

    await Promise.all([user.save(), Wallet.insertMany(data)]);

    return res.status(200).json({ status: true, message: "Success", user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Server Error",
      user: "",
    });
  }
};

// store call detail when user do call
exports.call = async (req, res) => {
  try {
    const { callerUserId, receiverUserId, channel, agoraUID, callType } = req.body;

    if (!callerUserId || !receiverUserId || !channel) {
      return res.status(200).json({ status: false, message: "Invalid Details!" });
    }

    if (!["video", "audio"].includes(callType)) {
      return res.status(200).json({
        status: false,
        message: "Invalid call type",
      });
    }

    const [callerUser, receiverUser, block] = await Promise.all([
      User.findById(callerUserId),
      User.findById(receiverUserId),
      Block.findOne({
        $or: [
          { userId: callerUserId, toUserId: receiverUserId },
          { userId: receiverUserId, toUserId: callerUserId },
        ],
      }),
    ]);

    if (!callerUser) return res.status(200).json({ status: false, message: "Caller user does not exist!" });
    if (!receiverUser) return res.status(200).json({ status: false, message: "Receiver user does not exist!" });

    if (block) {
      return res.status(200).json({
        status: false,
        message: "Call cannot be made. One of the users has blocked the other.",
      });
    }

    let walletType;
    let isAudio;

    if (callType === "video") {
      walletType = 3;
    } else {
      walletType = 20;
    }

    const role = RtcRole.PUBLISHER;
    const uid = agoraUID || 0;
    const expirationTimeInSeconds = 24 * 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const [token, outgoing] = await Promise.all([
      RtcTokenBuilder.buildTokenWithUid(global.settingJSON.agoraKey, global.settingJSON.agoraCertificate, channel, uid, role, privilegeExpiredTs),
      new Wallet({
        userId: callerUserId,
        diamond: 0,
        type: walletType,
        callType,
        isIncome: false,
        otherUserId: receiverUserId,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }).save(),
    ]);

    callerUser.callId = outgoing._id.toString();
    receiverUser.callId = outgoing._id.toString();

    await Promise.all([callerUser.save(), receiverUser.save()]);

    res.status(200).json({
      status: true,
      message: "Success",
      callId: outgoing._id,
      token,
    });

    if (!receiverUser.isBlock && receiverUser.isOnline && receiverUser.fcmToken) {
      const adminPromise = await admin;

      const payload = {
        token: receiverUser.fcmToken,
        notification: {
          title: "Incoming Call..",
          body: `${isAudio ? `Audio call From ${callerUser.name}` : `Video call From ${callerUser.name}`}`,
        },
        data: {
          title: "Incoming Call..",
          callFrom: String(callerUser.name),
          action: "",
          userId1: String(receiverUser._id),
          userId2: String(callerUser._id),
          user2Name: String(callerUser.name),
          user2Image: String(callerUser.image),
          callRoomId: String(outgoing._id),
          type: `${isAudio ? "Audio call" : "Video call"}`,
        },
      };

      console.log("Payload in call: ", payload);

      adminPromise
        .messaging()
        .send(payload)
        .then((response) => {
          console.log("Successfully sent FCM: ", response);
        })
        .catch((error) => {
          console.error("Error sending FCM: ", error);
        });
    }
  } catch (error) {
    console.error("Call Error:", error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get income and outgoing total [diamond & rCoin]
exports.incomeOutgoingDiamondRcoinTotal = async (req, res) => {
  try {
    // remove 0 from date string if 0 exist
    var sDate = req.query.startDate.replace(/(^|\/)0+/g, "$1");
    var eDate = req.query.endDate.replace(/(^|\/)0+/g, "$1");

    const dateFilterQuery = {
      analyticDate: { $gte: sDate, $lte: eDate },
    };

    const [user, income] = await Promise.all([
      User.findById(req.query.userId),
      Wallet.aggregate([
        {
          $match: { userId: new mongoose.Types.ObjectId(req.query.userId) },
        },
        {
          $addFields: addFieldQuery,
        },
        {
          $match: dateFilterQuery,
        },
        {
          $group: {
            _id: null,
            diamondIncome: {
              $sum: {
                $cond: [{ $eq: ["$isIncome", true] }, "$diamond", 0],
              },
            },
            rCoinIncome: {
              $sum: {
                $cond: [{ $eq: ["$isIncome", true] }, "$rCoin", 0],
              },
            },
            diamondOutgoing: {
              $sum: {
                $cond: [{ $eq: ["$isIncome", false] }, "$diamond", 0],
              },
            },
            rCoinOutgoing: {
              $sum: {
                $cond: [{ $eq: ["$isIncome", false] }, "$rCoin", 0],
              },
            },
          },
        },
      ]),
    ]);

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    const diamond = {
      income: income.length > 0 ? income[0].diamondIncome : 0,
      outgoing: income.length > 0 ? income[0].diamondOutgoing : 0,
    };
    const rCoin = {
      income: income.length > 0 ? income[0].rCoinIncome : 0,
      outgoing: income.length > 0 ? income[0].rCoinOutgoing : 0,
    };

    return res.status(200).json({ status: true, message: "Success!!", diamond, rCoin });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get income and outgoing history [diamond & rCoin]
exports.incomeOutgoingDiamondRcoinHistory = async (req, res) => {
  try {
    // remove 0 from date string if 0 exist
    var sDate = req.query.startDate.replace(/(^|\/)0+/g, "$1"); // 3/01/2024
    var eDate = req.query.endDate.replace(/(^|\/)0+/g, "$1");

    const dateFilterQuery = {
      analyticDate: { $gte: sDate, $lte: eDate },
    };

    let diamondCoinQuery, sumField;
    if (req.query.type === "diamond") {
      diamondCoinQuery = {
        diamond: { $ne: null },
      };
      sumField = "$diamond";
    } else {
      diamondCoinQuery = {
        rCoin: { $ne: null },
      };
      sumField = "$rCoin";
    }

    const [user, history] = await Promise.all([
      User.findById(req.query.userId),
      Wallet.aggregate([
        {
          $match: {
            $and: [{ userId: new mongoose.Types.ObjectId(req.query.userId) }, diamondCoinQuery],
          },
        },
        {
          $addFields: addFieldQuery,
        },
        {
          $match: dateFilterQuery,
        },
        {
          $lookup: {
            from: "users",
            localField: "otherUserId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            isAdd: {
              $cond: [{ $eq: ["$isIncome", true] }, true, false],
            },
          },
        },
        {
          $project: {
            diamond: 1,
            rCoin: 1,
            paymentGateway: 1,
            type: 1,
            date: 1,
            userId: { $ifNull: ["$user._id", null] },
            userName: { $ifNull: ["$user.name", null] },
            isAdd: 1,
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $skip: req.query.start ? parseInt(req.query.start) : 0,
        },
        {
          $limit: req.query.limit ? parseInt(req.query.limit) : 10,
        },
        {
          $group: {
            _id: null,
            income: {
              $sum: {
                $cond: [{ $eq: ["$isAdd", true] }, sumField, 0],
              },
            },
            outgoing: {
              $sum: {
                $cond: [{ $eq: ["$isAdd", false] }, sumField, 0],
              },
            },
            history: { $push: "$$ROOT" },
          },
        },
        {
          $project: {
            _id: 0,
            income: 1,
            outgoing: 1,
            history: {
              $slice: ["$history", req.query.limit ? parseInt(req.query.limit) : 10],
            },
          },
        },
      ]),
    ]);

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    return res.status(200).json({
      status: true,
      message: "Success!!",
      incomeTotal: history.length > 0 ? history[0].income : 0,
      outgoingTotal: history.length > 0 ? history[0].outgoing : 0,
      history: history.length > 0 ? history[0].history : [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get all history of user [admin panel]
exports.history = async (req, res) => {
  try {
    console.log("history........................");

    const user = await User.findById(req.body.userId);
    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    const start = req.body.start ? parseInt(req.body.start) : 1;
    const limit = req.body.limit ? parseInt(req.body.limit) : 10;

    const addFieldQuery_ = {
      shortDate: { $arrayElemAt: [{ $split: ["$date", ", "] }, 0] },
    };

    let dateFilterQuery = {};
    if (req.body.startDate && req.body.endDate) {
      dateFilterQuery = {
        shortDate: { $gte: req.body.startDate, $lte: req.body.endDate },
      };
    }

    let history;

    if (req.body.type === "diamond" || req.body.type === "rCoin") {
      let diamondCoinQuery, sumField;
      if (req.body.type === "diamond") {
        diamondCoinQuery = {
          diamond: { $ne: null },
        };
        sumField = "$diamond";
      } else {
        diamondCoinQuery = {
          rCoin: { $ne: null },
        };
        sumField = "$rCoin";
      }

      history = await Wallet.aggregate([
        {
          $match: { $and: [{ userId: user._id }, diamondCoinQuery] },
        },
        {
          $addFields: addFieldQuery_,
        },
        {
          $match: dateFilterQuery,
        },
        {
          $lookup: {
            from: "users",
            localField: "otherUserId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            income: {
              $cond: [{ $eq: ["$isIncome", true] }, true, false],
            },
          },
        },
        {
          $project: {
            diamond: 1,
            rCoin: 1,
            paymentGateway: 1,
            type: 1,
            date: 1,
            userId: "$user",
            userName: { $ifNull: ["$user.name", null] },
            income: 1,
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $facet: {
            income: [
              { $skip: (start - 1) * limit }, // how many records you want to skip
              { $limit: limit },
            ],
            pageInfo: [
              { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
            ],
            incomeTotal: [
              {
                $group: {
                  _id: null,
                  income: {
                    $sum: {
                      $cond: [{ $eq: ["$income", true] }, sumField, 0],
                    },
                  },
                  outgoing: {
                    $sum: {
                      $cond: [{ $eq: ["$income", false] }, sumField, 0],
                    },
                  },
                },
              },
            ],
          },
        },
      ]);

      return res.status(200).json({
        status: true,
        message: "Success!!",
        total: history[0].pageInfo.length > 0 ? history[0].pageInfo[0].totalRecord : 0,
        incomeTotal: history[0].incomeTotal.length > 0 ? history[0].incomeTotal[0].income : 0,
        outgoingTotal: history[0].incomeTotal.length > 0 ? history[0].incomeTotal[0].outgoing : 0,
        history: history[0].income,
      });
    } else if (req.body.type === "call") {
      history = await Wallet.aggregate([
        {
          $match: {
            $and: [{ $or: [{ userId: user._id }, { otherUserId: user._id }] }, { $and: [{ diamond: { $ne: null } }, { type: 3 }] }],
          },
        },
        {
          $addFields: addFieldQuery_,
        },
        {
          $match: dateFilterQuery,
        },
        {
          $lookup: {
            from: "users",
            as: "user",
            let: { otherUserIds: "$otherUserId", userIds: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $cond: {
                      if: { $eq: ["$$userIds", user._id] },
                      then: { $eq: ["$$otherUserIds", "$_id"] },
                      else: { $eq: ["$$userIds", "$_id"] },
                    },
                  },
                },
              },
              {
                $project: {
                  name: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            callStartTime: 1,
            callEndTime: 1,
            callConnect: 1,
            diamond: 1,
            // duration:{$cond: [{ $eq: ["$callConnect", false]}, "00:00:00", moment.utc(moment(new Date("$callEndTime")).diff(moment(new Date("$callStartTime")))).format("HH:mm:ss")]},
            date: 1,
            type: {
              $cond: [
                { $eq: ["$callConnect", false] },
                "MissedCall",
                {
                  $cond: [{ $eq: ["$userId", user._id] }, "Outgoing", "Incoming"],
                },
              ],
            },
            userId: "$user",
            userName: { $ifNull: ["$user.name", null] },
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $facet: {
            callHistory: [
              { $skip: (start - 1) * limit }, // how many records you want to skip
              { $limit: limit },
            ],
            pageInfo: [
              { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
            ],
            callCharge: [
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: {
                      $cond: [{ $eq: ["$callConnect", true] }, "$diamond", 0],
                    },
                  },
                },
              },
            ],
          },
        },
      ]);

      return res.status(200).json({
        status: true,
        message: "Success!!",
        total: history[0].pageInfo.length > 0 ? history[0].pageInfo[0].totalRecord : 0,
        totalCallCharge: history[0].callCharge.length > 0 ? history[0].callCharge[0].total : 0,
        history: history[0].callHistory,
      });
    } else if (req.body.type === "liveStreaming") {
      history = await LiveStreamingHistory.aggregate([
        {
          $match: {
            userId: user._id,
          },
        },
        {
          $addFields: {
            shortDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
          },
        },
        {
          $match: dateFilterQuery,
        },
        {
          $project: {
            user: 1,
            duration: 1,
            gifts: 1,
            comments: 1,
            fans: 1,
            rCoin: 1,
            audio: 1,
            startTime: 1,
            endTime: 1,
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $facet: {
            LiveStreamingHistory: [
              { $skip: (start - 1) * limit }, // how many records you want to skip
              { $limit: limit },
            ],
            pageInfo: [
              { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
            ],
            income: [
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: "$rCoin",
                  },
                },
              },
            ],
          },
        },
      ]);

      return res.status(200).json({
        status: true,
        message: "Success!!",
        total: history[0].pageInfo.length > 0 ? history[0].pageInfo[0].totalRecord : 0,
        income: history[0].income.length > 0 ? history[0].income[0].total : 0,
        history: history[0].LiveStreamingHistory,
      });
    } else if (req.body.type == "gameCoin") {
      history = await Wallet.aggregate([
        {
          $match: {
            $and: [{ userId: user._id }, { type: { $in: [10, 15, 16, 17] } }],
          },
        },
        {
          $addFields: addFieldQuery_,
        },
        {
          $match: dateFilterQuery,
        },

        {
          $addFields: {
            income: {
              $cond: [{ $eq: ["$isIncome", true] }, true, false],
            },
          },
        },
        {
          $project: {
            diamond: 1,
            rCoin: 1,
            paymentGateway: 1,
            type: 1,
            date: 1,
            income: 1,
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $facet: {
            income: [
              { $skip: (start - 1) * limit }, // how many records you want to skip
              { $limit: limit },
            ],
            pageInfo: [
              { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
            ],
            incomeTotal: [
              {
                $group: {
                  _id: null,
                  income: {
                    $sum: {
                      $cond: [{ $eq: ["$income", true] }, "$diamond", 0],
                    },
                  },
                  outgoing: {
                    $sum: {
                      $cond: [{ $eq: ["$income", false] }, "$diamond", 0],
                    },
                  },
                },
              },
            ],
          },
        },
      ]);

      return res.status(200).json({
        status: true,
        message: "Success!!",
        total: history[0].pageInfo.length > 0 ? history[0].pageInfo[0].totalRecord : 0,
        incomeTotal: history[0].incomeTotal.length > 0 ? history[0].incomeTotal[0].income : 0,
        outgoingTotal: history[0].incomeTotal.length > 0 ? history[0].incomeTotal[0].outgoing : 0,
        history: history[0].income,
      });
    } else if (req.body.type === "audio") {
      history = await LiveStreamingHistory.aggregate([
        {
          $match: {
            userId: user._id,
            audio: true,
          },
        },
        {
          $addFields: {
            shortDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
          },
        },
        {
          $match: dateFilterQuery,
        },
        {
          $project: {
            user: 1,
            duration: 1,
            gifts: 1,
            comments: 1,
            fans: 1,
            rCoin: 1,
            startTime: 1,
            endTime: 1,
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $facet: {
            LiveStreamingHistory: [
              { $skip: (start - 1) * limit }, // how many records you want to skip
              { $limit: limit },
            ],
            pageInfo: [
              { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
            ],
            income: [
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: "$rCoin",
                  },
                },
              },
            ],
          },
        },
      ]);

      return res.status(200).json({
        status: true,
        message: "Success!!",
        total: history[0].pageInfo.length > 0 ? history[0].pageInfo[0].totalRecord : 0,
        income: history[0].income.length > 0 ? history[0].income[0].total : 0,
        history: history[0].LiveStreamingHistory,
      });
    } else if (req.body.type === "store") {
      history = await Wallet.aggregate([
        {
          $match: {
            $and: [{ userId: user._id }, { $or: [{ type: 9 }, { type: 11 }] }],
          },
        },
        {
          $addFields: addFieldQuery_,
        },
        {
          $match: dateFilterQuery,
        },
        {
          $lookup: {
            from: "avatarframes",
            localField: "avatarFrameId",
            foreignField: "_id",
            as: "avatarFrame",
          },
        },
        {
          $lookup: {
            from: "svgas",
            localField: "svgaId",
            foreignField: "_id",
            as: "svga",
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $project: {
            _id: 1,
            diamond: 1,
            userId: 1,
            avatarFrameId: 1,
            svgaId: 1,
            date: 1,
            avatarFrameName: { $first: "$avatarFrame.name" },
            svgaName: { $first: "$svga.name" },
          },
        },
        {
          $facet: {
            storeHistory: [{ $skip: (start - 1) * limit }, { $limit: limit }],
            pageInfo: [
              { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
            ],
            outgoing: [
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: "$diamond",
                  },
                },
              },
            ],
          },
        },
      ]);

      return res.status(200).json({
        status: true,
        message: "Success!!",
        total: history,
        total: history[0].pageInfo.length > 0 ? history[0].pageInfo[0].totalRecord : 0,
        history: history.length > 0 ? history[0]?.storeHistory : [],
        outgoing: history[0].outgoing.length > 0 ? history[0].outgoing[0].total : 0,
      });
    } else if (req.body.type == "coinSeller") {
      history = await Wallet.aggregate([
        {
          $match: { $and: [{ userId: user._id }, { type: 12 }] },
        },
        {
          $addFields: addFieldQuery_,
        },
        {
          $match: dateFilterQuery,
        },
        {
          $addFields: {
            income: {
              $cond: [{ $eq: ["$isIncome", true] }, true, false],
            },
          },
        },
        {
          $project: {
            diamond: 1,
            rCoin: 1,
            paymentGateway: 1,
            type: 1,
            date: 1,
            income: 1,
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $facet: {
            income: [
              { $skip: (start - 1) * limit }, // how many records you want to skip
              { $limit: limit },
            ],
            pageInfo: [
              { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
            ],
            incomeTotal: [
              {
                $group: {
                  _id: null,
                  income: {
                    $sum: {
                      $cond: [{ $eq: ["$income", true] }, "$diamond", 0],
                    },
                  },
                  outgoing: {
                    $sum: {
                      $cond: [{ $eq: ["$income", false] }, "$diamond", 0],
                    },
                  },
                },
              },
            ],
          },
        },
      ]);

      return res.status(200).json({
        status: true,
        message: "Success",
        total: history[0].pageInfo.length > 0 ? history[0].pageInfo[0].totalRecord : 0,
        incomeTotal: history[0].incomeTotal.length > 0 ? history[0].incomeTotal[0].income : 0,
        outgoingTotal: history[0].incomeTotal.length > 0 ? history[0].incomeTotal[0].outgoing : 0,
        history: history[0].income,
      });
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.liveAnalytic = async (req, res) => {
  try {
    const now_ = new Date().getTime();
    const now = new Date(now_ - (now_ % 86400000)); // get current date
    const currentWeekDay = now.getDay();
    const lessDays = currentWeekDay === 0 ? 6 : currentWeekDay - 1; // handle sunday to monday week start day
    const wkStart = new Date(new Date(now).setDate(now.getDate() - lessDays));
    // const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [user, weekLiveHistory, todayLiveHistory, weekAudioHistory, todayAudioHistory] = await Promise.all([
      User.findById(req.body.userId),
      LiveStreamingHistory.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(req.body.userId),
            audio: false,
          },
        },
        {
          $addFields: {
            analyticDate: {
              $toDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
            },
          },
        },
        {
          $addFields: {
            shortDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
          },
        },
        {
          $match: { analyticDate: { $gte: new Date(wkStart) } }, //dateFilterQuery
        },
      ]),
      LiveStreamingHistory.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(req.body.userId),
            audio: false,
          },
        },
        {
          $addFields: {
            analyticDate: {
              $toDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
            },
          },
        },
        {
          $addFields: {
            shortDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
          },
        },
        {
          $match: { analyticDate: { $gte: new Date(now) } }, //dateFilterQuery
        },
      ]),
      LiveStreamingHistory.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(req.body.userId),
            audio: true,
          },
        },
        {
          $addFields: {
            analyticDate: {
              $toDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
            },
          },
        },
        {
          $addFields: {
            shortDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
          },
        },
        {
          $match: { analyticDate: { $gte: new Date(wkStart) } }, //dateFilterQuery
        },
      ]),
      LiveStreamingHistory.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(req.body.userId),
            audio: true,
          },
        },
        {
          $addFields: {
            analyticDate: {
              $toDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
            },
          },
        },
        {
          $addFields: {
            shortDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
          },
        },
        {
          $match: { analyticDate: { $gte: new Date(now) } }, //dateFilterQuery
        },
      ]),
    ]);

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    //week liveStreaming
    let weekLiveHistoryDifferences = [];
    for (let i = 0; i < weekLiveHistory.length; i++) {
      weekLiveHistoryDifferences.push(weekLiveHistory[i].duration);
    }
    console.log(weekLiveHistoryDifferences, "weekLiveHistoryDifferences");
    var totalDuration = moment.duration();

    for (var i = 0; i < weekLiveHistoryDifferences.length; i++) {
      var duration = moment.duration(weekLiveHistoryDifferences[i]);
      totalDuration.add(duration);
    }
    var weekLiveStreaming = moment.utc(totalDuration.asMilliseconds()).format("HH:mm:ss");

    //today liveStreaming
    let todayLiveHistoryDifferences = [];
    for (let i = 0; i < todayLiveHistory.length; i++) {
      todayLiveHistoryDifferences.push(todayLiveHistory[i].duration);
    }
    console.log(todayLiveHistoryDifferences, "todayLiveHistoryDifferences");
    var todayLiveHistoryTotalDuration = moment.duration();

    for (var i = 0; i < todayLiveHistoryDifferences.length; i++) {
      var duration = moment.duration(todayLiveHistoryDifferences[i]);
      todayLiveHistoryTotalDuration.add(duration);
    }
    var todayLiveStreaming = moment.utc(todayLiveHistoryTotalDuration.asMilliseconds()).format("HH:mm:ss");

    //week audio
    let weekAudioDifferences = [];
    for (let i = 0; i < weekAudioHistory.length; i++) {
      weekAudioDifferences.push(weekAudioHistory[i].duration);
    }
    console.log(weekAudioDifferences, "weekAudioDifferences");
    var totalAudioDuration = moment.duration();

    for (var i = 0; i < weekAudioDifferences.length; i++) {
      var duration = moment.duration(weekAudioDifferences[i]);
      totalAudioDuration.add(duration);
    }
    var weekAudio = moment.utc(totalAudioDuration.asMilliseconds()).format("HH:mm:ss");

    //today audio
    let todayAudioDifferences = [];
    for (let i = 0; i < todayAudioHistory.length; i++) {
      todayAudioDifferences.push(todayAudioHistory[i].duration);
    }
    console.log(todayAudioDifferences, "todayAudioDifferences");
    var todayAudioDuration = moment.duration();

    for (var i = 0; i < todayAudioDifferences.length; i++) {
      var duration = moment.duration(todayAudioDifferences[i]);
      todayAudioDuration.add(duration);
    }
    var todayAudio = moment.utc(todayAudioDuration.asMilliseconds()).format("HH:mm:ss");

    return res.status(200).json({
      status: true,
      message: "Success!!",
      weekLiveStreaming,
      todayLiveStreaming,
      weekAudio,
      todayAudio,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get all history of user [admin panel]
exports.historyLive = async (req, res) => {
  try {
    console.log("history........................");

    let dateFilterQuery = {};

    if (req.body.startDate && req.body.endDate) {
      dateFilterQuery = {
        shortDate: { $gte: req.body.startDate, $lte: req.body.endDate },
      };
    }

    const [user, history] = await Promise.all([
      User.findById(req.body.userId),
      LiveStreamingHistory.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(req.body.userId),
          },
        },
        {
          $addFields: {
            shortDate: { $arrayElemAt: [{ $split: ["$startTime", ", "] }, 0] },
          },
        },
        {
          $match: dateFilterQuery,
        },
        {
          $project: {
            user: 1,
            duration: 1,
            gifts: 1,
            comments: 1,
            fans: 1,
            rCoin: 1,
            startTime: 1,
            endTime: 1,
            audio: 1,
          },
        },
        {
          $sort: { _id: -1 },
        },
        {
          $facet: {
            LiveStreamingHistory: [
              { $skip: req.body.start ? parseInt(req.body.start) : 0 }, // how many records you want to skip
              { $limit: req.body.limit ? parseInt(req.body.limit) : 20 },
            ],
            pageInfo: [
              { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
            ],
            income: [
              {
                $group: {
                  _id: null,
                  total: {
                    $sum: "$rCoin",
                  },
                },
              },
            ],
          },
        },
      ]),
    ]);

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    return res.status(200).json({
      status: true,
      message: "Success!!",
      total: history[0].pageInfo.length > 0 ? history[0].pageInfo[0].totalRecord : 0,
      income: history[0].income.length > 0 ? history[0].income[0].total : 0,
      history: history[0].LiveStreamingHistory,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.sendGiftFakeHost = async (req, res) => {
  try {
    if (!req.query.senderUserId && !req.query.coin) {
      return res.send({
        status: true,
        message: "invalid details",
      });
    }

    const senderUser = await User.findById(req.query.senderUserId).populate("level");
    if (!senderUser) {
      return res.send({
        status: true,
        message: "senderUser dose not exist",
      });
    }

    if (senderUser.diamond < req.query.coin) {
      return res.send({
        status: true,
        message: "inSufficient diamond",
      });
    }

    console.log("senderUser.spentCoin", senderUser.spentCoin);
    console.log("parseInt(req.query.coin)", parseInt(req.query.coin));

    senderUser.diamond -= parseInt(req.query.coin);
    senderUser.spentCoin += parseInt(req.query.coin);
    await senderUser.save();

    if (req.query.type == "live") {
      const outgoing = new Wallet();
      outgoing.userId = senderUser._id;
      outgoing.diamond = parseInt(req.query.coin);
      outgoing.type = 0;
      outgoing.isIncome = false;
      outgoing.otherUserId = null;
      outgoing.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      await outgoing.save();
    }

    if (req.query.type == "call") {
      const outgoing = new Wallet();
      outgoing.userId = senderUser._id;
      outgoing.diamond = parseInt(req.query.coin);
      outgoing.type = 3;
      outgoing.isIncome = false;
      outgoing.otherUserId = null;
      outgoing.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      await outgoing.save();
    }

    if (req.query.type.trim().toLowerCase() == "callgift") {
      const outgoing = new Wallet();
      outgoing.userId = senderUser._id;
      outgoing.diamond = parseInt(req.query.coin);
      outgoing.type = 19;
      outgoing.isIncome = false;
      outgoing.otherUserId = null;
      outgoing.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      await outgoing.save();
    }

    if (req.query.type.trim().toLowerCase() == "chatgift") {
      const outgoing = new Wallet();
      outgoing.userId = senderUser._id;
      outgoing.diamond = parseInt(req.query.coin);
      outgoing.type = 18;
      outgoing.isIncome = false;
      outgoing.otherUserId = null;
      outgoing.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      await outgoing.save();
    }

    return res.send({
      status: true,
      message: "success",
      user: senderUser,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.teenPatti = async (req, res) => {
  try {
    const adminCoin = await GameAdminCoin.findOne();

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let dateFilterQuery = {};
    if (req.query.startDate && req.query.startDate !== "ALL" && req.query.endDate !== "ALL") {
      sDate = req.query.startDate + "T00:00:00.000Z"; //2023-09-14
      eDate = req.query.endDate + "T00:00:00.000Z"; //2023-09-14

      //for date query

      dateFilterQuery = {
        analytic: {
          $gte: new Date(sDate),
          $lte: new Date(eDate),
        },
      };
    }

    const teenPattiHistory = await TeenPattiHistory.aggregate([
      {
        $addFields: {
          analytic: {
            $toDate: { $arrayElemAt: [{ $split: ["$date", ", "] }, 0] },
          },
        },
      },
      {
        $match: dateFilterQuery,
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $project: {
          userBits: 0,
        },
      },
      {
        $facet: {
          history: [
            { $skip: (start - 1) * limit }, // how many records you want to skip
            { $limit: limit },
          ],
          pageInfo: [
            { $group: { _id: null, count: { $sum: 1 } } }, // get total records count
          ],
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      adminCoin: adminCoin.coin,
      totalPage: teenPattiHistory[0]?.pageInfo.length > 0 ? teenPattiHistory[0]?.pageInfo[0]?.count : 0,
      gameHistories: teenPattiHistory[0]?.history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.rouletteCasino = async (req, res) => {
  try {
    const adminCoin = await GameAdminCoin.findOne();

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let dateFilterQuery = {};
    if (req.query.startDate !== "ALL" && req.query.endDate !== "ALL") {
      sDate = req.query.startDate + "T00:00:00.000Z"; //2023-09-14
      eDate = req.query.endDate + "T00:00:00.000Z"; //2023-09-14

      //for date query
      dateFilterQuery = {
        analytic: {
          $gte: new Date(sDate),
          $lte: new Date(eDate),
        },
      };
    }

    const rouletteCasinoHistory = await RouletteCasinoHistory.aggregate([
      {
        $addFields: {
          analytic: {
            $toDate: { $arrayElemAt: [{ $split: ["$date", ", "] }, 0] },
          },
        },
      },
      {
        $match: dateFilterQuery,
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $project: {
          cardCoin: 0,
        },
      },
      {
        $facet: {
          history: [
            { $skip: (start - 1) * limit }, // how many records you want to skip
            { $limit: limit },
          ],
          pageInfo: [
            { $group: { _id: null, count: { $sum: 1 } } }, // get total records count
          ],
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      adminCoin: adminCoin.coin,
      totalPage: rouletteCasinoHistory[0]?.pageInfo.length > 0 ? rouletteCasinoHistory[0]?.pageInfo[0]?.count : 0,
      gameHistories: rouletteCasinoHistory[0]?.history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.ferryWheel = async (req, res) => {
  try {
    const adminCoin = await GameAdminCoin.findOne();

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let dateFilterQuery = {};
    if (req.query.startDate !== "ALL" && req.query.endDate !== "ALL") {
      sDate = req.query.startDate + "T00:00:00.000Z"; //2023-09-14
      eDate = req.query.endDate + "T00:00:00.000Z"; //2023-09-14

      //for date query

      dateFilterQuery = {
        analytic: {
          $gte: new Date(sDate),
          $lte: new Date(eDate),
        },
      };
    }
    const ferryWheelHistory = await FerryWheelHistory.aggregate([
      {
        $addFields: {
          analytic: {
            $toDate: { $arrayElemAt: [{ $split: ["$date", ", "] }, 0] },
          },
        },
      },
      {
        $match: dateFilterQuery,
      },
      {
        $sort: {
          _id: -1,
        },
      },
      {
        $project: {
          frameCoin: 0,
          userBits: 0,
        },
      },
      {
        $facet: {
          history: [
            { $skip: (start - 1) * limit }, // how many records you want to skip
            { $limit: limit },
          ],
          pageInfo: [
            { $group: { _id: null, count: { $sum: 1 } } }, // get total records count
          ],
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      adminCoin: adminCoin.coin,
      totalPage: ferryWheelHistory[0]?.pageInfo.length > 0 ? ferryWheelHistory[0]?.pageInfo[0]?.count : 0,
      gameHistories: ferryWheelHistory[0]?.history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.agencyHistory = async (req, res) => {
  try {
    if (!req.query.agencyId || !req.query.startDate || !req.query.endDate) {
      return res.status(200).json({
        status: false,
        message: "Invalid details",
      });
    }

    const agency = await Agency.findById(req.query.agencyId);

    if (!agency) {
      return res.status(200).json({
        status: false,
        message: "Agency not found",
      });
    }

    const hosts = await User.find({ hoatAgecy: agency._id });

    // Extract all host IDs
    const hostIds = hosts.map((host) => host._id);

    const startDate = moment(req.query.startDate).format("YYYY-MM-DD");
    const endDate = moment(req.query.endDate).format("YYYY-MM-DD");

    const [hostEarningResult, agencyEarningResult] = await Promise.all([
      Wallet.aggregate([
        {
          $addFields: {
            newDate: {
              $arrayElemAt: [{ $split: [{ $toString: "$createdAt" }, "T"] }, 0],
            },
          },
        },
        {
          $match: {
            $and: [{ newDate: { $gte: startDate } }, { newDate: { $lte: endDate } }, { type: { $in: [13, 0] } }, { userId: { $in: hostIds } }, { isIncome: true }],
          },
        },
        {
          $group: {
            _id: null, // Group all matching documents
            totalHostEarning: { $sum: "$rCoin" }, // Sum rCoin field for host
          },
        },
      ]),

      Wallet.aggregate([
        {
          $addFields: {
            newDate: {
              $arrayElemAt: [{ $split: [{ $toString: "$createdAt" }, "T"] }, 0],
            },
          },
        },
        {
          $match: {
            $and: [{ newDate: { $gte: startDate } }, { newDate: { $lte: endDate } }, { type: 17 }, { agencyId: agency._id }],
          },
        },
        {
          $group: {
            _id: null, // Group all matching documents
            totalAgencyEarning: { $sum: "$rCoin" }, // Sum rCoin field for agency
          },
        },
      ]),
    ]);

    // Extract total earnings
    const totalHostEarning = hostEarningResult.length > 0 ? hostEarningResult[0].totalHostEarning : 0;
    const totalAgencyEarning = agencyEarningResult.length > 0 ? agencyEarningResult[0].totalAgencyEarning : 0;

    // Output or return results
    return res.status(200).json({
      status: true,
      totalHostEarning,
      totalAgencyEarning,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.agencyTodayStats = async (req, res) => {
  try {
    if (!req.query.agencyId) {
      return res.status(200).json({
        status: false,
        message: "Invalid details",
      });
    }

    const agency = await Agency.findById(req.query.agencyId);

    if (!agency) {
      return res.status(200).json({
        status: false,
        message: "Agency not found",
      });
    }

    const agencyHosts = await User.find({ hostAgency: agency._id });

    const todayStart = moment().startOf("day").toDate();
    const todayEnd = moment().endOf("day").toDate();

    // Extract all host IDs
    const hostIds = agencyHosts.map((host) => host._id);
    console.log("agencyHosts", hostIds);

    const [hostEarningResult, agencyEarningResult] = await Promise.all([
      Wallet.aggregate([
        {
          $addFields: {
            newDate: {
              $arrayElemAt: [{ $split: [{ $toString: "$createdAt" }, "T"] }, 0],
            },
          },
        },
        {
          $match: {
            createdAt: { $gte: todayStart, $lte: todayEnd },
            type: { $in: [13, 0] },
            userId: { $in: hostIds },
            isIncome: true,
          },
        },

        {
          $group: {
            _id: null, // Group all matching documents
            totalHostEarning: { $sum: "$rCoin" }, // Sum rCoin field for host
          },
        },
      ]),

      Wallet.aggregate([
        {
          $addFields: {
            newDate: {
              $arrayElemAt: [{ $split: [{ $toString: "$createdAt" }, "T"] }, 0],
            },
          },
        },
        {
          $match: {
            $and: [{ newDate: { $gte: moment().format("YYYY-MM-DD") } }, { newDate: { $lte: moment().format("YYYY-MM-DD") } }, { type: 17 }, { agencyId: agency._id }],
          },
        },
        {
          $group: {
            _id: null, // Group all matching documents
            totalAgencyEarning: { $sum: "$rCoin" }, // Sum rCoin field for agency
          },
        },
      ]),
    ]);

    // Extract total earnings
    const totalHostEarning = hostEarningResult.length > 0 ? hostEarningResult[0].totalHostEarning : 0;
    const totalAgencyEarning = agencyEarningResult.length > 0 ? agencyEarningResult[0].totalAgencyEarning : 0;

    // Output or return results
    return res.status(200).json({
      status: true,
      totalHostEarning,
      totalAgencyEarning,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.allAgencyHistory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(200).json({ status: false, message: "Invalid details" });
    }

    const useDateFilter = startDate !== "ALL" && endDate !== "ALL";
    const formattedStartDate = useDateFilter ? moment(startDate).format("YYYY-MM-DD") : null;
    const formattedEndDate = useDateFilter ? moment(endDate).format("YYYY-MM-DD") : null;

    const agencies = await Agency.find();
    if (!agencies.length) {
      return res.status(200).json({ status: false, message: "No agencies found" });
    }

    const agencyResults = [];

    for (const agency of agencies) {
      const hosts = await User.find({ hostAgency: agency._id });
      const hostIds = hosts.map((h) => h._id);
      const hostCount = hostIds.length;

      if (!hostCount) {
        agencyResults.push({
          agencyId: agency._id,
          agencyName: agency.name,
          agencyCode: agency.agencyCode,
          totalHostEarning: 0,
          totalAgencyEarning: 0,
          hostCount: 0,
        });
        continue;
      }

      const dateMatch = useDateFilter
        ? [
            {
              $addFields: {
                newDate: {
                  $arrayElemAt: [{ $split: [{ $toString: "$createdAt" }, "T"] }, 0],
                },
              },
            },
          ]
        : [];

      const hostEarningPipeline = [
        ...dateMatch,
        {
          $match: {
            ...(useDateFilter && {
              newDate: { $gte: formattedStartDate, $lte: formattedEndDate },
            }),
            type: { $in: [0, 13] },
            userId: { $in: hostIds },
            isIncome: true,
          },
        },
        {
          $group: {
            _id: null,
            totalHostEarning: { $sum: "$rCoin" },
          },
        },
      ];

      const agencyEarningPipeline = [
        ...dateMatch,
        {
          $match: {
            ...(useDateFilter && {
              newDate: { $gte: formattedStartDate, $lte: formattedEndDate },
            }),
            type: 17,
            agencyId: agency._id,
          },
        },
        {
          $group: {
            _id: null,
            totalAgencyEarning: { $sum: "$rCoin" },
          },
        },
      ];

      const [hostEarningResult, agencyEarningResult] = await Promise.all([Wallet.aggregate(hostEarningPipeline), Wallet.aggregate(agencyEarningPipeline)]);

      const totalHostEarning = hostEarningResult.length > 0 ? hostEarningResult[0].totalHostEarning : 0;
      const totalAgencyEarning = agencyEarningResult.length > 0 ? agencyEarningResult[0].totalAgencyEarning : 0;

      agencyResults.push({
        agencyId: agency._id,
        agencyName: agency.name,
        agencyCode: agency.agencyCode,
        totalHostEarning,
        totalAgencyEarning,
        hostCount,
      });
    }

    return res.status(200).json({
      status: true,
      agencyResults,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
