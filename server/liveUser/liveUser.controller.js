const LiveUser = require("./liveUser.model");
const User = require("../user/user.model");
const Follower = require("../follower/follower.model");
const LiveStreamingHistory = require("../liveStreamingHistory/liveStreamingHistory.model");
const FansRanking = require("../fansRanking/fansRanking.model");
const Wallet = require("../wallet/wallet.model");
const Agency = require("../agency/agency.model");
const Block = require("../block/block.model");

const mongoose = require("mongoose");
const { RtcTokenBuilder, RtcRole } = require("agora-access-token");

//private key
const admin = require("../../util/privateKey");

//momemt
const moment = require("moment");

const config = require("../../config");

const LiveUserFunction = async (user, data) => {
  user.name = data.name;
  user.country = data.country.toLowerCase();
  user.image = data.image;
  user.token = data.token;
  user.channel = data.channel;
  user.diamond = data.diamond;
  user.username = data.username;
  user.isVIP = data.isVIP;
  user.liveUserId = data._id;
  user.countryFlagImage = data.countryFlagImage;
  user.age = data.age;
  user.avatarFrameImage = data.avatarFrameImage;
  user.uniqueId = data.uniqueId;

  await user.save();
  return user;
};

const { AccessToken } = require("livekit-server-sdk");

// Generate token
exports.generateAuthToken = async (req, res) => {
  try {
    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "Setting does not found!" });
    }

    const { roomName, participantName } = req.query;

    if (!roomName || !participantName) {
      return res.status(200).json({
        status: false,
        message: "roomName and participantName are required",
      });
    }

    const at = new AccessToken(settingJSON?.livekitApiKey, settingJSON?.livekitApiSecret, {
      identity: participantName,
    });

    at.addGrant({ roomJoin: true, room: roomName });

    const token = await at.toJwt();

    return res.status(200).json({
      status: true,
      message: "Token generated successfully",
      token,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    return res.status(500).json({ status: false, message: error.message || "Server Error" });
  }
};

exports.generateToken = async (req, res) => {
  try {
    if (!req.query.channelName) {
      return res.status(200).json({ status: false, message: "Invalid Details !" });
    }

    if (!settingJSON) return res.status(200).json({ status: false, message: "Setting Not Found" });

    const role = RtcRole.PUBLISHER;
    const account = "0";
    const expirationTimeInSeconds = 24 * 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithAccount(settingJSON.agoraKey, settingJSON.agoraCertificate, req.query.channelName, account, role, privilegeExpiredTs);

    return res.status(200).json({ status: true, message: "Success", token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.getLiveUserByAdmin = async (req, res) => {
  try {
    const liveUser = await LiveUser.find({}).populate({
      path: "liveUserId",
      select: "name level gender rCoin country followers following",
      populate: {
        path: "level",
        model: "Level",
        select: "name",
      },
    });
    return res.status(200).json({ status: true, message: "Success", liveUser });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.liveTime = async (req, res) => {
  try {
    if (!req.query.liveUserId || !req.query.liveStreamingId) {
      return res.status(500).json({ status: false, message: "Invalid Details !!" });
    }

    const liveUser = await LiveUser.findOne({
      liveUserId: req.query.liveUserId,
      liveStreamingId: req.query.liveStreamingId,
    });

    if (!liveUser) {
      return res.status(200).json({ status: false, message: "liveUser does not exist !!" });
    }

    if (liveUser) {
      liveUser.time = moment().add(1, "minutes").unix();
      await liveUser.save();
    }

    return res.status(200).json({ status: true, message: "Success" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.updateRoomImage = async (req, res) => {
  try {
    if (!req.file || !req.body.liveUserId) {
      return res.status(200).json({
        status: false,
        message: "liveUserId and roomImage must be requried.",
      });
    }

    const liveUser = await LiveUser.findOne({ liveUserId: req.body.liveUserId });
    if (!liveUser) {
      return res.status(200).json({ status: false, message: "liveUser does not found." });
    }

    liveUser.roomImage = req.file ? config?.baseURL + req?.file?.path : "";
    await liveUser.save();

    res.status(200).json({
      status: true,
      message: "roomImage has been updated.",
    });

    const socket = await io.in(liveUser.liveStreamingId.toString()).fetchSockets();
    socket?.length ? socket[0].join(liveUser.liveStreamingId.toString()) : console.log("socket not able to join in roomImage API");
    console.log("socket in handleRoomImage API:   ", socket.length);

    const xyz = io.sockets.adapter.rooms.get(liveUser.liveStreamingId.toString());
    console.log("fetched in handleRoomImage API:  ", xyz);

    io.in(liveUser.liveStreamingId.toString()).emit("roomImage", liveUser.roomImage);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

exports.updatePrivateCode = async (req, res) => {
  try {
    if (!req.query.privateCode || !req.query.liveUserId) {
      return res.status(200).json({
        status: false,
        message: "liveUserId and privateCode must be requried.",
      });
    }

    const liveUser = await LiveUser.findOne({ liveUserId: req.query.liveUserId });
    if (!liveUser) {
      return res.status(200).json({ status: false, message: "liveUser does not found." });
    }

    liveUser.privateCode = Number(req.query.privateCode);
    await liveUser.save();

    liveUser.view = liveUser.view.filter((item) => item.isAdd === true).length;

    return res.status(200).json({
      status: true,
      message: "PrivateCode has been updated.",
      liveUser: {
        ...liveUser.toObject(),
        view: liveUser.view[0],
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

exports.userIsLive = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.channel) {
      return res.status(200).json({ status: false, message: "Invalid Details!" });
    }

    const role = RtcRole.PUBLISHER;
    const uid = req.body.agoraUID ? req.body.agoraUID : 0;
    const expirationTimeInSeconds = 24 * 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "Setting Not Found" });
    }

    const userId = new mongoose.Types.ObjectId(req.body.userId);

    let [user, token, existsLiveUser, liveStreamingHistory, followers] = await Promise.all([
      User.findById(userId),
      RtcTokenBuilder.buildTokenWithUid(settingJSON.agoraKey, settingJSON.agoraCertificate, req.body?.channel, uid, role, privilegeExpiredTs),
      LiveUser.findOne({ liveUserId: userId }),
      LiveStreamingHistory({
        audio: req.body?.audio ? req.body?.audio : false,
        userId: userId,
        momentStartTime: moment(new Date()).format("HH:mm:ss"),
        startTime: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }).save(),
      Follower.find({
        toUserId: userId,
      }).populate({
        path: "fromUserId",
        select: "name fcmToken isBlock notification ",
      }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    user.isOnline = true;
    user.isBusy = true;
    user.token = token;
    user.channel = req.body.channel;
    await user.save();

    if (existsLiveUser) {
      if (!existsLiveUser.audio) {
        console.log("Existing live user deleted for normal live", existsLiveUser.audio);
        await existsLiveUser.deleteOne();
      }

      if (req.body.audio) {
        console.log("Audio live exists");

        existsLiveUser.expiration_date = null;
        existsLiveUser.agoraUID = req?.body?.agoraUID;
        existsLiveUser.roomName = req?.body?.roomName || existsLiveUser.roomName;
        existsLiveUser.roomWelcome = req?.body?.roomWelcome || existsLiveUser.roomWelcome;
        existsLiveUser.roomImage = req.file ? config?.baseURL + req?.file?.path : existsLiveUser.roomImage;
        existsLiveUser.background = req?.body?.background || existsLiveUser.background;
        existsLiveUser.privateCode = req?.body?.privateCode || existsLiveUser.privateCode;
        existsLiveUser.isPublic = req?.body?.isPublic || existsLiveUser.isPublic;
        await existsLiveUser.save();

        const viewsWithAddTrue = existsLiveUser.view.filter((view) => view.isAdd === true);

        res.status(200).json({
          status: true,
          message: "Success",
          liveUser: {
            ...existsLiveUser._doc,
            view: viewsWithAddTrue?.length,
          },
        });

        for (let i = 0; i < followers.length; i += 1000) {
          const filteredFollowers = followers.filter((data) => data.fromUserId && !data.fromUserId.isBlock && data.fromUserId.notification?.favoriteLive);
          const batchHosts = filteredFollowers.slice(i, i + 1000);
          const registrationTokens = batchHosts.map((data) => data.fromUserId.fcmToken);

          if (registrationTokens) {
            const adminPromise = await admin;

            const payload = {
              tokens: registrationTokens,
              notification: {
                title: `${user?.name} is Live`,
              },
              data: {
                data: JSON.stringify({
                  _id: existsLiveUser?._id,
                  liveUserId: existsLiveUser?.liveUserId,
                  name: existsLiveUser?.name,
                  country: existsLiveUser?.country,
                  image: existsLiveUser?.image,
                  token: existsLiveUser?.token,
                  channel: existsLiveUser?.channel,
                  diamond: existsLiveUser?.diamond,
                  username: existsLiveUser?.username,
                  isVIP: existsLiveUser?.isVIP,
                  age: existsLiveUser?.age,
                  liveStreamingId: existsLiveUser?.liveStreamingId,
                  view: String(0),
                }),
                type: "LIVE",
              },
            };

            adminPromise
              .messaging()
              .sendEachForMulticast(payload)
              .then((response) => {
                console.log("Successfully sent with response: ", response);

                if (response.failureCount > 0) {
                  response.responses.forEach((res, index) => {
                    if (!res.success) {
                      console.error(`Error for token ${registrationTokens[index]}:`, res.error.message);
                    }
                  });
                }
              })
              .catch((error) => {
                console.log("Error sending message:      ", error);
              });
          }
        }
        return;
      }
    }

    console.log("AFTER =========================", req.body);

    const createLiveUser = new LiveUser();
    createLiveUser.roomName = req?.body?.roomName ? req?.body?.roomName : "";
    createLiveUser.roomWelcome = req?.body?.roomWelcome ? req?.body?.roomWelcome : "";
    createLiveUser.privateCode = req?.body?.privateCode ? Number(req?.body?.privateCode) : 0;
    createLiveUser.roomImage = req.file ? config?.baseURL + req?.file?.path : "";
    createLiveUser.background = req.body.background || createLiveUser.background;
    createLiveUser.isPublic = req.body.isPublic;
    createLiveUser.audio = req.body?.audio ? req.body?.audio : false;
    createLiveUser.liveStreamingId = liveStreamingHistory._id;
    createLiveUser.agoraUID = req.body.agoraUID;
    createLiveUser.filter = req.body?.filter;
    createLiveUser.time = moment().add(1, "minutes").unix();

    if (req.body.audio) {
      console.log("Audio Live");

      createLiveUser.expiration_date = null;
    } else {
      console.log("Any Other Live");

      // const createdAt = new Date();
      // const expirationDate = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);
      createLiveUser.expiration_date = null;
    }

    let LiveUserData;
    LiveUserData = await LiveUserFunction(createLiveUser, user);

    res.status(200).json({
      status: true,
      message: "Success",
      liveUser: { ...createLiveUser._doc, view: 0 },
    });

    for (let i = 0; i < followers.length; i += 1000) {
      const filteredFollowers = followers.filter((data) => data.fromUserId && !data.fromUserId.isBlock && data.fromUserId.notification?.favoriteLive);
      const batchHosts = filteredFollowers.slice(i, i + 1000);
      const registrationTokens = batchHosts.map((data) => data.fromUserId.fcmToken);

      if (registrationTokens) {
        const adminPromise = await admin;

        const payload = {
          tokens: registrationTokens,
          notification: {
            title: `${user?.name} is Live`,
          },
          data: {
            data: JSON.stringify({
              _id: LiveUserData._id,
              liveUserId: LiveUserData.liveUserId,
              name: LiveUserData.name,
              country: LiveUserData.country,
              image: LiveUserData.image,
              token: LiveUserData.token,
              channel: LiveUserData.channel,
              diamond: LiveUserData.diamond,
              username: LiveUserData.username,
              isVIP: LiveUserData.isVIP,
              age: LiveUserData.age,
              liveStreamingId: LiveUserData.liveStreamingId,
              view: String(0),
            }),
            type: "LIVE",
          },
        };

        adminPromise
          .messaging()
          .sendEachForMulticast(payload)
          .then((response) => {
            console.log("Successfully sent with response: ", response);

            if (response.failureCount > 0) {
              response.responses.forEach((res, index) => {
                if (!res.success) {
                  console.error(`Error for token ${registrationTokens[index]}:`, res.error.message);
                }
              });
            }
          })
          .catch((error) => {
            console.log("Error sending message:      ", error);
          });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

exports.fakeLiveUser = async (req, res) => {
  try {
    if (settingJSON.isFake) {
      const fakeUser = await User.find({ isFake: true, isBlock: false })
        .select("_id name country isFake fakeDataType image link  pkVideoArray pkImageArray age isVIP avatarFrameImage countryFlagImage username diamond rCoin channel roomName roomWelcome roomImage")
        .skip(req.query.start ? parseInt(req.query.start) : 0)
        .limit(req.query.limit ? parseInt(req.query.limit) : 20);

      const fakeUserList = fakeUser.map((data) => ({
        ...data._doc,
        agoraUID: null,
        liveStreamingId: null,
        liveUserId: null,
        token: null,
        seat: [],
        background: null,
        isPkMode: data.fakeDataType == 1 ? true : false,
        audio: data.fakeDataType == 2 ? true : false,
        view: Math.floor(30 + (100 - 6) * Math.random()),
      }));

      return res.status(200).json({
        status: true,
        message: "FakeData get SuccessFully!!",
        users: fakeUserList,
      });
    } else {
      return res.status(200).json({
        status: true,
        message: "FakeData Switch is off!",
        users: [],
      });
    }
  } catch {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
      user: "",
    });
  }
};

exports.getLiveUser = async (req, res) => {
  try {
    const { userId, type, start, limit, country } = req.query;

    if (!country) {
      return res.status(200).json({ status: false, message: "country must be provided." });
    }

    if (!userId || !type) {
      return res.status(200).json({ status: false, message: "type and userId must be provided." });
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [user, blockedUserIds] = await Promise.all([User.findById(userObjectId).select("_id").lean(), Block.distinct("toUserId", { userId: userObjectId })]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User not found!" });
    }

    const matchConditions = {
      liveUserId: { $ne: userObjectId, $nin: blockedUserIds },
    };

    if (country && country.toLowerCase() !== "global") {
      matchConditions.country = country.toLowerCase();
    }

    switch (type) {
      case "All":
        matchConditions.isPublic = true;
        matchConditions.$or = [
          { isPkMode: true },
          { audio: false },
          {
            audio: true,
            $or: [{ isHostExists: true }, { seat: { $elemMatch: { userId: { $ne: null } } } }],
          },
        ];
        break;

      case "NormalLive":
        matchConditions.audio = false;
        matchConditions.isPkMode = false;
        break;

      case "AudioLive":
        matchConditions.audio = true;
        matchConditions.$or = [{ isHostExists: true }, { seat: { $elemMatch: { userId: { $ne: null } } } }];
        break;

      case "PkLive":
        matchConditions.isPkMode = true;
        break;

      case "PkRequest":
        matchConditions.audio = false;
        matchConditions.isPkMode = false;
        break;

      default:
        return res.status(200).json({ status: false, message: "Invalid type provided." });
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: "livestreaminghistories",
          let: { liveStreamingId: "$liveStreamingId" },
          pipeline: [{ $match: { $expr: { $eq: ["$$liveStreamingId", "$_id"] } } }],
          as: "liveStreaming",
        },
      },
      { $unwind: { path: "$liveStreaming", preserveNullAndEmptyArrays: false } },
      {
        $addFields: {
          view: {
            $size: {
              $filter: { input: "$view", as: "item", cond: { $eq: ["$$item.isAdd", true] } },
            },
          },
          isFake: false,
          link: null,
          pkVideoArray: [],
          pkImageArray: [],
        },
      },
      { $sort: { comments: -1, gifts: -1 } },
      { $skip: parseInt(start) || 0 },
      { $limit: parseInt(limit) || 20 },
    ];

    const users = await LiveUser.aggregate(pipeline);

    return res.status(200).json({
      status: true,
      message: "Success",
      users,
    });
  } catch (error) {
    console.error("Error fetching live users:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

exports.checkLive = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({
        status: false,
        message: "Invalid details.",
      });
    }

    const liveUser = await LiveUser.findOne({ liveUserId: req.query.userId });
    if (!liveUser) {
      return res.status(200).json({ status: false, message: "liveUser does not found." });
    }

    const viewsWithAddTrue = liveUser?.view.filter((view) => view.isAdd === true);

    return res.status(200).json({
      status: true,
      message: "Success",
      liveUser: {
        ...liveUser._doc,
        view: viewsWithAddTrue.length,
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

exports.broadcastAlertSound = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Invalid Details!" });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, followers] = await Promise.all([
      User.findById(userId).select("_id").lean(),
      Follower.find({
        toUserId: userId,
      })
        .populate({
          path: "fromUserId",
          select: "name fcmToken isBlock notification ",
        })
        .lean(),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    res.status(200).json({ status: true, message: "Success" });

    for (let i = 0; i < followers.length; i += 1000) {
      const filteredFollowers = followers.filter((data) => data.fromUserId && !data.fromUserId.isBlock && data.fromUserId.notification?.favoriteLive);
      const batchHosts = filteredFollowers.slice(i, i + 1000);
      const registrationTokens = batchHosts.map((data) => data.fromUserId.fcmToken);

      if (registrationTokens) {
        const adminPromise = await admin;

        const payload = {
          tokens: registrationTokens,
          notification: {
            title: "A Host is Live Now! 🔴🎙️",
          },
          data: {
            data: JSON.stringify({
              liveUserId: user?._id,
              name: user?.name,
              country: user?.country,
              image: user?.image,
              token: user?.token,
              channel: user?.channel,
              diamond: user?.diamond,
              username: user?.username,
              isVIP: user?.isVIP,
              age: user?.age,
              view: String(0),
            }),
            type: "LIVE",
          },
        };

        adminPromise
          .messaging()
          .sendEachForMulticast(payload)
          .then((response) => {
            console.log("Successfully sent with response: ", response);

            if (response.failureCount > 0) {
              response.responses.forEach((res, index) => {
                if (!res.success) {
                  console.error(`Error for token ${registrationTokens[index]}:`, res.error.message);
                }
              });
            }
          })
          .catch((error) => {
            console.log("Error sending message:      ", error);
          });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//host live cut by admin (popup send through socket in Host)
exports.liveStreamingCutByAdmin = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.liveStreamingId) {
      return res.status(500).json({ status: false, message: "Invalid Details !!" });
    }

    const liveUser = await LiveUser.findOne({
      liveUserId: req.query.userId,
      liveStreamingId: req.query.liveStreamingId,
    });

    if (!liveUser) {
      return res.status(500).json({ status: false, message: "liveUser does not exist !!" });
    }

    res.status(200).json({ status: true, message: "Success" });

    io.in(liveUser.liveStreamingId.toString()).emit("liveEndByEnd", liveUser._id);
    io.in(liveUser.liveUserId.toString()).emit("liveEndByEnd", liveUser._id);

    //await liveUser.deleteOne();

    if (liveUser && !liveUser.audio) {
      await liveUser.deleteOne();
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//delete audio live room
exports.terminateAudioSession = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(200).json({ status: false, message: "User ID is required." });
    }

    const liveUser = await LiveUser.findOne({ audio: true, liveUserId: userId }).select("_id liveStreamingId liveUserId").lean();

    if (!liveUser) {
      return res.status(200).json({ status: false, message: "Live user session not found." });
    }

    res.status(200).json({ status: true, message: "Audio session terminated successfully." });

    io.in(liveUser.liveStreamingId.toString()).emit("liveSessionEnded", liveUser._id);
    io.in(liveUser.liveUserId.toString()).emit("liveSessionEnded", liveUser._id);

    await LiveUser.deleteOne({ _id: liveUser._id });
  } catch (error) {
    console.error("Error terminating audio session:", error);
    return res.status(500).json({ status: false, message: "Internal server error." });
  }
};

//retrive history spending diamond wise in particular user's liveRoom
exports.fansRanking = async (req, res) => {
  try {
    if (!req.query.type) {
      return res.status(200).json({ status: false, message: "Oops! Invalid details!" });
    }

    let start, end;
    const type = req.query.type.trim().toLowerCase() || "daily";

    if (type === "daily") {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (type === "weekly") {
      const today = new Date();
      const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;
      start = new Date(today.setDate(today.getDate() - offset));
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (type === "monthly") {
      start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else {
      return res.status(200).json({ status: false, message: "Type must be valid" });
    }

    const history = await FansRanking.aggregate([
      {
        $match: {
          type: 0,
          diamond: { $ne: 0 },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$roomId",
          totalSpentDiamond: { $sum: "$diamond" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "roomOwner",
        },
      },
      {
        $unwind: {
          path: "$roomOwner",
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $project: {
          _id: 0,
          name: "$roomOwner.name", // Fixed issue
          image: "$roomOwner.image", // Fixed issue
          totalSpentDiamond: 1,
        },
      },
      {
        $sort: { totalSpentDiamond: -1 },
      },
      {
        $limit: 50,
      },
    ]);

    return res.status(200).json({ status: true, message: "Success!", data: history });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//retrive history spending diamond wise (user ranking spending)
exports.fetchUserSpendingRankings = async (req, res) => {
  try {
    const type = req.query.type.trim().toLowerCase() || "daily";
    let start, end;

    if (type === "daily") {
      start = new Date();
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (type === "weekly") {
      const today = new Date();
      const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;

      start = new Date(today.setDate(today.getDate() - offset));
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (type === "monthly") {
      start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid" });
    }

    const history = await Wallet.aggregate([
      {
        $match: {
          isIncome: false,
          diamond: { $ne: null },
          userId: { $ne: null },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId", //_id of the user who spend diamond
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
        $group: {
          _id: "$userId",
          name: { $first: "$user.name" },
          name: { $first: "$user.name" },
          username: { $first: "$user.username" },
          image: { $first: "$user.image" },
          country: { $first: "$user.country" },
          countryFlagImage: { $first: "$user.countryFlagImage" },
          totalSpentDiamond: { $sum: "$diamond" },
        },
      },
      {
        $sort: { totalSpentDiamond: -1 },
      },
    ]);

    return res.status(200).json({ status: true, message: "Success", data: history });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//retrive history receiving rCoin wise (host ranking receiving)
exports.fetchHostReceivingRankings = async (req, res) => {
  try {
    const type = req.query.type.trim().toLowerCase() || "daily";
    let start, end;

    if (type === "daily") {
      start = new Date();
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (type === "weekly") {
      const today = new Date();
      const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;

      start = new Date(today.setDate(today.getDate() - offset));
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (type === "monthly") {
      start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid" });
    }

    const history = await Wallet.aggregate([
      {
        $match: {
          isIncome: true,
          rCoin: { $ne: null },
          userId: { $ne: null },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId", //_id of the user who earn coin
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
        $match: {
          "user.isHost": true,
        },
      },
      {
        $group: {
          _id: "$userId",
          name: { $first: "$user.name" },
          username: { $first: "$user.username" },
          image: { $first: "$user.image" },
          country: { $first: "$user.country" },
          countryFlagImage: { $first: "$user.countryFlagImage" },
          totalEarnrCoin: { $sum: "$rCoin" },
        },
      },
      {
        $sort: { totalEarnrCoin: -1 },
      },
    ]);

    return res.status(200).json({ status: true, message: "Success", data: history });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//retrive history receiving commission rCoin wise (agency ranking receiving)
exports.fetchAgencyReceivingRankings = async (req, res) => {
  try {
    const type = req.query.type.trim().toLowerCase() || "daily";
    let start, end;

    if (type === "daily") {
      start = new Date();
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (type === "weekly") {
      const today = new Date();
      const offset = today.getDay() === 0 ? 6 : today.getDay() - 1;

      start = new Date(today.setDate(today.getDate() - offset));
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else if (type === "monthly") {
      start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      start.setHours(0, 0, 0, 0);

      end = new Date();
      end.setHours(23, 59, 59, 999);
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid" });
    }

    const history = await Wallet.aggregate([
      {
        $match: {
          type: 17,
          isIncome: true,
          rCoin: { $ne: null },
          agencyId: { $ne: null },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: "agencies",
          localField: "agencyId",
          foreignField: "_id",
          as: "agency",
        },
      },
      {
        $unwind: {
          path: "$agency",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$agency._id",
          name: { $first: "$agency.name" },
          agencyCode: { $first: "$agency.agencyCode" },
          image: { $first: "$agency.image" },
          totalEarnrCoin: { $sum: "$rCoin" },
        },
      },
      {
        $sort: { totalEarnrCoin: -1 },
      },
      { $limit: 50 },
    ]);

    return res.status(200).json({ status: true, message: "Success", data: history });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
