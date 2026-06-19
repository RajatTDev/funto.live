const User = require("./user.model");
const Follower = require("../follower/follower.model");
const VIPPlan = require("../vipPlan/vipPlan.model");
const Wallet = require("../wallet/wallet.model");
const Level = require("../level/level.model");
const Flag = require("../flag/flag.model");
const Purchase = require("../purchase/purchase.model");
const LiveUser = require("../liveUser/liveUser.model");
const Block = require("../block/block.model");

const mongoose = require("mongoose");

//fs
const fs = require("fs");

//config
const config = require("../../config");

//moment
const moment = require("moment");

const arrayShuffle = require("shuffle-array");
const { compressImage } = require("../../util/compressImage");

const { deleteFile, deleteFiles } = require("../../util/deleteFile");

const userFunction = async (user, data) => {
  user.name = data.name ? data.name : user.name;
  user.gender = data.gender ? data.gender : user.gender;
  user.age = data.age ? data.age : user.age;
  user.image = data.image === "" ? (data.gender.toLowerCase() === "female" ? `${config.baseURL}storage/female.png` : `${config.baseURL}storage/male.png`) : data.image;
  user.country = data.country;
  user.ip = data.ip;
  user.identity = data.identity;
  user.loginType = data.loginType;
  user.username = data.username ? data.username.trim() : user.username;
  user.email = data.email;
  user.fcmToken = data.fcmToken;
  user.lastLogin = new Date().toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
  });

  await user.save();
  return user;
};

const checkSvga = async (userId, res) => {
  try {
    console.log("check SVGA", Date.now());

    const user = await User.findById(userId);
    if (!user) return user;

    if (user.isVIP) {
      return user;
    }

    let purchase;
    if (user.liveJoinSvga) {
      purchase = await Purchase.exists({
        userId: user._id,
        svga: user.liveJoinSvga,
      });

      if (!purchase) {
        user.liveJoinSvga = null;
      }
    }

    if (user.avatarFrame) {
      purchase = await Purchase.exists({
        userId: user._id,
        frame: user.avatarFrame,
      });

      if (!purchase) {
        user.avatarFrame = null;
        user.avatarFrameImage = "";
      }
    }

    await user.save();
    return user;
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error });
  }
};

const updateLevel = async (userId, res) => {
  try {
    const [user, levels] = await Promise.all([User.findById(userId).select("spentCoin level").lean(), Level.find().sort({ coin: -1 }).select("_id coin").lean()]);

    if (!user) return;

    let updatedLevel = levels[0]?._id;
    for (const data of levels) {
      if (user.spentCoin <= data?.coin) {
        updatedLevel = data?._id;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(userId, { $set: { level: updatedLevel } }, { new: true })
      .select("-notification -plan -roomName -roomWelcome -roomImage -linkType -imageType -link -video -post -isFake -isDemo -isBusy -bankDetails -agency")
      .populate("level liveJoinSvga avatarFrame")
      .lean();

    return updatedUser;
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get users list
exports.index = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let matchQuery = {};
    let sortQuery = {};
    if (req.query.search != "ALL") {
      matchQuery = {
        $or: [
          { username: { $regex: req.query.search, $options: "i" } },
          { name: { $regex: req.query.search, $options: "i" } },
          { gender: { $regex: req.query.search, $options: "i" } },
          { country: { $regex: req.query.search, $options: "i" } },
          { searchUniqueId: { $regex: req.query.search, $options: "i" } },
        ],
      };
    }

    if (req.query.diamond === "asc") {
      sortQuery = { ...sortQuery, diamond: 1 };
    }
    if (req.query.diamond === "desc") {
      sortQuery = { ...sortQuery, diamond: -1 };
    }
    if (req.query.rcoin === "asc") {
      sortQuery = { ...sortQuery, rcoin: 1 };
    }
    if (req.query.rcoin === "desc") {
      sortQuery = { ...sortQuery, rcoin: -1 };
    }
    // let query;
    // if (req.query.type === "Fake") {
    //   query = {
    //     isFake: true,
    //   };
    // } else {
    //   query = {
    //     isFake: false,
    //   };
    // }

    let dateFilterQuery = {};
    if (req.query.startDate !== "ALL" && req.query.endDate !== "ALL") {
      const parseDate = (dateString) => {
        const [year, month, day] = dateString.split(/[-/]/).map(Number);
        return new Date(Date.UTC(year, month - 1, day));
      };

      const sDate = parseDate(req.query.startDate);
      const eDate = parseDate(req.query.endDate);

      dateFilterQuery = {
        analyticDate: {
          $gte: sDate,
          $lte: eDate,
        },
      };
    }

    const user = await User.aggregate([
      { $addFields: { searchUniqueId: { $toString: "$uniqueId" } } },
      {
        $match: {
          ...matchQuery,
          isFake: false,
        },
      },
      {
        $addFields: {
          analyticDate: {
            $toDate: { $arrayElemAt: [{ $split: ["$analyticDate", ", "] }, 0] },
          },
        },
      },
      {
        $match: dateFilterQuery,
      },
      {
        $lookup: {
          from: "levels",
          localField: "level",
          foreignField: "_id",
          as: "level",
        },
      },
      {
        $unwind: {
          path: "$level",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { ...sortQuery, analyticDate: -1 },
      },
      {
        $facet: {
          user: [
            { $skip: (start - 1) * limit }, // how many records you want to skip
            { $limit: limit },
          ],
          gender: [
            { $group: { _id: { $toLower: "$gender" }, gender: { $sum: 1 } } }, // get total records count
          ],
          pageInfo: [
            { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
          ],
          onlineUsersCount: [{ $match: { isOnline: true } }, { $group: { _id: null, count: { $sum: 1 } } }],
        },
      },
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "Data not found!" });
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      total: user[0].pageInfo.length > 0 ? user[0].pageInfo[0].totalRecord : 0,
      activeUser: user[0].onlineUsersCount.length > 0 ? user[0].onlineUsersCount[0].count : 0,
      maleFemale: user[0].gender,
      user: user[0].user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get type wise fake data
exports.getFakeData = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let matchQuery = {};
    let sortQuery = { analyticDate: -1 };
    if (req.query.search != "ALL") {
      matchQuery = {
        $or: [
          { username: { $regex: req.query.search, $options: "i" } },
          { name: { $regex: req.query.search, $options: "i" } },
          { gender: { $regex: req.query.search, $options: "i" } },
          { country: { $regex: req.query.search, $options: "i" } },
        ],
      };
    }

    if (req.query.sort === "diamond") {
      sortQuery = { diamond: -1 };
    }

    let dateFilterQuery = {};

    if (req.query.startDate !== "ALL" && req.query.endDate !== "ALL") {
      sDate = req.query.startDate + "T00:00:00.000Z";
      eDate = req.query.endDate + "T00:00:00.000Z";

      dateFilterQuery = {
        analyticDate: {
          $gte: new Date(sDate),
          $lte: new Date(eDate),
        },
      };
    }

    if (req.query.fakeDataType === "fakeLiveVideo") {
      const [totalRecord, user] = await Promise.all([
        User.countDocuments({
          ...matchQuery,
          isFake: true,
          fakeDataType: 0,
        }),
        User.aggregate([
          {
            $match: { ...matchQuery, isFake: true, fakeDataType: 0 },
          },
          {
            $addFields: {
              analyticDate: {
                $toDate: {
                  $arrayElemAt: [{ $split: ["$analyticDate", ", "] }, 0],
                },
              },
            },
          },
          {
            $match: dateFilterQuery,
          },
          {
            $lookup: {
              from: "levels",
              localField: "level",
              foreignField: "_id",
              as: "level",
            },
          },
          {
            $unwind: {
              path: "$level",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: { ...sortQuery },
          },
          { $skip: (start - 1) * limit }, //how many records you want to skip
          { $limit: limit },
        ]),
      ]);

      return res.status(200).json({
        status: true,
        message: "Success",
        total: totalRecord,
        user: user,
      });
    } else if (req.query.fakeDataType === "fakePkLiveVideo") {
      const [totalRecord, user] = await Promise.all([
        User.countDocuments({
          ...matchQuery,
          isFake: true,
          fakeDataType: 1,
        }),
        User.aggregate([
          {
            $match: { ...matchQuery, isFake: true, fakeDataType: 1 },
          },
          {
            $addFields: {
              analyticDate: {
                $toDate: {
                  $arrayElemAt: [{ $split: ["$analyticDate", ", "] }, 0],
                },
              },
            },
          },
          {
            $match: dateFilterQuery,
          },
          {
            $lookup: {
              from: "levels",
              localField: "level",
              foreignField: "_id",
              as: "level",
            },
          },
          {
            $unwind: {
              path: "$level",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: { analyticDate: -1 },
          },
          { $skip: (start - 1) * limit }, //how many records you want to skip
          { $limit: limit },
        ]),
      ]);
      return res.status(200).json({
        status: true,
        message: "Success",
        total: totalRecord,
        user: user,
      });
    } else if (req.query.fakeDataType === "fakeAudioLive") {
      const [totalRecord, user] = await Promise.all([
        User.countDocuments({
          ...matchQuery,
          isFake: true,
          fakeDataType: 2,
        }),
        User.aggregate([
          {
            $match: { ...matchQuery, isFake: true, fakeDataType: 2 },
          },
          {
            $addFields: {
              analyticDate: {
                $toDate: {
                  $arrayElemAt: [{ $split: ["$analyticDate", ", "] }, 0],
                },
              },
            },
          },
          {
            $match: dateFilterQuery,
          },
          {
            $lookup: {
              from: "levels",
              localField: "level",
              foreignField: "_id",
              as: "level",
            },
          },
          {
            $unwind: {
              path: "$level",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $sort: { analyticDate: -1 },
          },
          { $skip: (start - 1) * limit }, //how many records you want to skip
          { $limit: limit },
        ]),
      ]);

      return res.status(200).json({
        status: true,
        message: "Success",
        total: totalRecord,
        user: user,
      });
    } else {
      return res.status(200).json({ status: false, message: "fakeDataType must be passed valid." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get popular user by its follower count
exports.getPopularUser = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "userId is required" });
    }

    const [user, followerIds] = await Promise.all([User.findById(req.query.userId), Follower.find({ fromUserId: req.query.userId }).distinct("toUserId")]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User not found" });
    }

    const top_users = await User.find({ _id: { $nin: followerIds } })
      .sort({
        followers: -1,
      })
      .limit(10);

    return res.status(200).json({ status: true, message: "Success!!", top_users });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//user signup and login
exports.loginSignup = async (req, res) => {
  try {
    if (!req.body.identity || !req.body.email) return res.status(200).json({ status: false, message: "Oops ! Invalid details!!", user: {} });

    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "Setting does not found." });
    }

    let userQuery, userNameExist, flag;
    if (req.body.loginType == 0) {
      if (!req.body.email) {
        return res.status(200).json({ status: false, message: "email must be required!" });
      }

      userQuery = await User.findOne({
        email: req.body.email.trim(),
        loginType: 0,
      }).populate("level liveJoinSvga avatarFrame");

      if (userQuery) {
        console.log("with email login");

        if (userQuery.isBlock) {
          return res.status(200).json({ status: false, message: "You are blocked by admin!" });
        }

        userQuery.fcmToken = req?.body?.fcmToken;
        userQuery.identity = req?.body?.identity || userQuery?.identity;
        userQuery.lastLogin = new Date().toLocaleString("en-US", {
          timeZone: "Asia/Kolkata",
        });
        await userQuery.save();

        return res.status(200).json({ status: true, message: "Success", user: userQuery });
      }
    }

    userQuery = await User.findOne({
      $and: [{ identity: req.body.identity }, { email: req.body.email }],
    }).populate("level liveJoinSvga avatarFrame");

    if (userQuery) {
      if (userQuery.isBlock) {
        console.log("user is blocked in loginSignup:  ", userQuery.isBlock);
        return res.status(200).json({ status: false, message: "You are blocked by admin!" });
      }

      userQuery.fcmToken = req.body.fcmToken;
      userQuery.lastLogin = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      await userQuery.save();

      return res.status(200).json({ status: true, message: "Success", user: userQuery });
    }

    console.log("New user");

    [userNameExist, flag] = await Promise.all([
      User.exists({
        username: { $regex: new RegExp(`^${req.body.username}$`, "i") },
      }),
      Flag.findOne({ name: req.body?.country.trim() }),
    ]);

    if (req.body.username) {
      if (userNameExist) {
        return res.status(200).json({
          status: false,
          message: "Username already taken!",
          user: {},
        });
      }
    }

    const newUser = new User();
    const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let referralCode = "";
    for (let i = 0; i < 8; i++) {
      referralCode += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    newUser.countryFlagImage = flag?.flag;
    newUser.referralCode = referralCode;
    newUser.analyticDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    newUser.diamond += settingJSON ? settingJSON.loginBonus : 0;

    var digits = Math.floor(Math.random() * 1005101) + 10000000;
    newUser.uniqueId = digits;

    const user = await userFunction(newUser, req.body);

    const user_ = await updateLevel(user._id);

    res.status(200).json({ status: true, message: "Success", user: user_ });

    if (settingJSON && settingJSON.loginBonus > 0) {
      const income = new Wallet();
      income.userId = user._id;
      income.diamond = settingJSON ? settingJSON.loginBonus : 0;
      income.type = 5;
      income.date = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      await income.save();
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
      user: {},
    });
  }
};

//get profile of user who login
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(200).json({ status: false, message: "userId must be needed!", user: {} });
    }

    const user = await updateLevel(req.query.userId);
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!", user: {} });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "You are blocked by admin!" });
    }

    let data = {
      ...user,
      svgaImage: user?.liveJoinSvga?.image || "",
    };

    return res.status(200).json({ status: true, message: "Success", user: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Server Error",
      user: "",
    });
  }
};

//update profile of user
exports.updateProfile = async (req, res) => {
  try {
    const [user, flag, userNameExist] = await Promise.all([
      User.findById(req.body.userId).populate("level liveJoinSvga avatarFrame"),
      Flag.findOne({ name: req.body?.country?.trim() }),
      User.exists({
        _id: { $ne: new mongoose.Types.ObjectId(req.body.userId) },
        username: { $regex: new RegExp(`^${req.body.username}$`, "i") },
      }),
    ]);

    if (!user) {
      deleteFiles(req.files);
      return res.status(200).json({
        status: false,
        message: "User does not Exist!",
        user: {},
      });
    }

    if (req.files && req.files.image) {
      var image_ = user.image.split("storage");
      if (image_[1] !== "/male.png" && image_[1] !== "/female.png") {
        if (fs.existsSync("storage" + image_[1])) {
          fs.unlinkSync("storage" + image_[1]);
        }
      }

      compressImage(req.files.image[0]);
      user.image = config.baseURL + req.files.image[0].path;
    }

    if (req.body?.username) {
      if (userNameExist) {
        return res.status(200).json({
          status: false,
          message: "Username already taken!",
          user: {},
        });
      }

      user.username = req.body.username.trim();
    }

    if (req.body.country && flag) {
      user.countryFlagImage = flag.flag ? flag.flag : user.countryFlagImage;
    }

    user.coverImage = req.files.coverImage ? config.baseURL + req.files.coverImage[0].path : user.coverImage;
    user.name = req.body.name;
    user.bankDetails = req.body.bankDetails ? req.body.bankDetails : user.bankDetails;
    user.bio = req.body.bio;
    user.gender = req.body.gender;
    user.age = req.body.age;
    await user.save();

    res.status(200).json({ status: true, message: "Success", user });

    const liveUser = await LiveUser.findOne({
      liveUserId: user._id,
      audio: true,
    });

    if (liveUser) {
      liveUser.name = user?.name;
      liveUser.image = user?.image;
      await liveUser.save();
    }
  } catch (error) {
    deleteFiles(req.files);
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Server Error",
      user: {},
    });
  }
};

//get user profile of post[feed]
exports.getProfileUser = async (req, res) => {
  try {
    let query;
    if (req.body.profileUserId) {
      query = {
        _id: req.body.profileUserId,
      };
    } else {
      query = {
        username: req.body.username,
      };
    }

    const [user, profileUser] = await Promise.all([
      User.findById(req.body.userId),
      User.findOne({ ...query })
        .populate("level")
        .select(
          "name username gender age image country uniqueId bio followers following video post level isVIP coverImage loginType avatarFrameImage countryFlagImage isAgency isHost isCoinSeller link isFake"
        ),
    ]);

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    if (!profileUser) return res.status(200).json({ status: false, message: "User does not Exist!" });

    var isFollow = false;
    const isFollowExist = await Follower.exists({
      fromUserId: user._id,
      toUserId: profileUser._id,
    });

    if (isFollowExist) {
      isFollow = true;
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      user: { ...profileUser._doc, userId: profileUser._id, isFollow },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//search user by name and username
exports.search = async (req, res) => {
  try {
    const [user, blockedUserIds] = await Promise.all([
      User.findById(new mongoose.Types.ObjectId(req.body.userId)).select("_id").lean(),
      Block.distinct("toUserId", {
        userId: new mongoose.Types.ObjectId(req.body.userId),
      }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    const [response] = await Promise.all([
      User.aggregate([
        {
          $match: {
            $and: [
              { _id: { $ne: new mongoose.Types.ObjectId(req.body.userId) } },
              { _id: { $nin: blockedUserIds } },
              { isBlock: false },
              { gender: { $ne: "" } },
              {
                $or: [{ name: { $regex: req.body.value, $options: "i" } }, { username: { $regex: req.body.value, $options: "i" } }],
              },
            ],
          },
        },
        {
          $lookup: {
            from: "followers",
            let: { toUserIds: "$_id" },
            as: "isFollow",
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$toUserId", "$$toUserIds"] },
                      {
                        $eq: ["$fromUserId", new mongoose.Types.ObjectId(req.body.userId)],
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "levels",
            localField: "level",
            foreignField: "_id",
            as: "level",
          },
        },
        {
          $unwind: {
            path: "$level",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            isFollow: { $gt: [{ $size: "$isFollow" }, 0] },
          },
        },
        {
          $project: {
            _id: 1,
            userId: "$_id",
            name: 1,
            username: 1,
            gender: 1,
            age: 1,
            image: 1,
            country: 1,
            countryFlagImage: 1,
            bio: 1,
            followers: 1,
            following: 1,
            video: 1,
            post: 1,
            level: 1,
            isVIP: 1,
            isFollow: 1,
            isFake: 1,
          },
        },
        { $skip: req.body.start ? parseInt(req.body.start) : 0 },
        { $limit: req.body.limit ? parseInt(req.body.limit) : 20 },
      ]),
    ]);

    return res.status(200).json({ status: true, message: "Success!!", user: response });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.coinAdd = async (req, res) => {
  try {
    if (!req.query.userId || !req.query.coin) {
      return res.status(200).json({ status: false, message: "Invalid details !!" });
    }

    const user = await User.findOne({ _id: req.query.userId });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found !!" });
    }

    user.diamond += parseInt(req.query.coin);

    const wallet = new Wallet();
    wallet.type = 9;
    wallet.userId = user._id;
    wallet.diamond = parseInt(req.query.coin);
    wallet.isIncome = true;
    wallet.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    await Promise.all([user.save(), wallet.save()]);

    return res.status(200).json({ status: true, message: "Success!!", user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//check referral code is valid and add referral bonus
exports.referralCode = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.referralCode) return res.status(200).json({ status: false, message: "Invalid Details!!", user: {} });

    const [user, referralCodeUser] = await Promise.all([User.findById(req.body.userId).populate("level liveJoinSvga avatarFrame"), User.findOne({ referralCode: req.body.referralCode })]);

    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "Setting does not found." });
    }

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!!", user: {} });

    if (user.referralCode === req.body.referralCode.trim())
      return res.status(200).json({
        status: false,
        message: "You can't use your own Referral Code!",
        user: {},
      });

    if (!referralCodeUser)
      return res.status(200).json({
        status: false,
        message: "Referral Code is not Exist!!",
        user: {},
      });

    if (!user.isReferral) {
      user.isReferral = true;
      user.diamond += settingJSON ? settingJSON.referralBonus : 0;

      referralCodeUser.rCoin += settingJSON ? settingJSON.referralCoinBonus : 0;
      referralCodeUser.referralCount += 1;

      let walletData = [
        {
          userId: referralCodeUser._id,
          rCoin: settingJSON ? settingJSON.referralCoinBonus : 0,
          type: 6,
          otherUserId: user._id,
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        },
        {
          userId: user._id,
          diamond: settingJSON ? settingJSON.referralBonus : 0,
          type: 6,
          otherUserId: referralCodeUser._id,
          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        },
      ];

      await Promise.all([user.save(), referralCodeUser.save(), Wallet.insertMany(walletData)]);

      return res.status(200).json({ status: true, message: "Success", user });
    }

    return res.status(200).json({
      status: false,
      message: "User already used a Referral Code!",
      user: {},
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//block unblock user
exports.blockUnblock = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    if (user.isDemo) {
      return res.status(200).json({ status: false, message: "This is demo user , can't block!!" });
    }
    user.isBlock = !user.isBlock;
    await user.save();

    return res.status(200).json({ status: true, message: "Success!!", user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//online the user
exports.userIsOnline = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    user.isOnline = true;
    user.isBusy = false;
    await user.save();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//offline the user
exports.offlineUser = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (user) {
      user.isOnline = false;
      user.isBusy = false;
      user.token = null;
      user.channel = null;
      await user.save();

      const liveUser = await LiveUser.find({ liveUserId: user._id });
      for (let index = 0; index < liveUser.length; index++) {
        const element = liveUser[index];
        if (element) {
          if (element.audio) {
            element.isHostExists = false;
            await element.save();
          } else {
            await element.deleteOne();
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get random match for call
exports.randomMatch = async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ status: false, message: "Invalid user ID" });
    }

    let gender, fakeUser;
    if (req.query.type) {
      const typeLower = req.query.type.toLowerCase();
      if (typeLower === "male" || typeLower === "female") {
        gender = new RegExp(`^${typeLower}$`, "i");
      }
    }

    const [user, blockedUserIds] = await Promise.all([User.findById(userId).select("_id").lean(), Block.distinct("toUserId", { userId: userId })]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    const [UserData, users] = await Promise.all([
      User.find({
        isFake: true,
        ...(gender && { gender }),
      })
        .populate("level")
        .select("name username gender age image country bio followers following video isFake post level isVIP loginType avatarFrameImage countryFlagImage link"),
      User.find({
        _id: {
          $ne: req.query.userId,
          $nin: blockedUserIds,
        },
        isOnline: true,
        isBusy: false,
        isFake: false,
        ...(gender && { gender }),
      })
        .populate("level")
        .select("name username gender age image country bio followers following video isFake post level isVIP loginType avatarFrameImage countryFlagImage link"),
    ]);

    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "Setting does not found." });
    }

    if (settingJSON.isFake) {
      fakeUser = await arrayShuffle(UserData);
    }

    const shuffleUser = await arrayShuffle(users);
    let userResult =
      shuffleUser.length > 0
        ? {
          ...shuffleUser[0]._doc,
          userId: shuffleUser[0]._id,
          isFake: shuffleUser[0].isFake,
        }
        : settingJSON.isFake
          ? {
            ...fakeUser[0]?._doc,
            userId: fakeUser[0]?._id,
            isFake: fakeUser[0]?.isFake,
          }
          : {};

    return res.status(200).json({
      status: userResult.userId ? true : false,
      message: userResult.userId ? "Success!" : "No one is Match!",
      user: userResult,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//admin add or less the rCoin or diamond of user through admin
exports.addLessRcoinDiamond = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    if ((req.body.rCoin && parseInt(req.body.rCoin) === user.rCoin) || (req.body.diamond && parseInt(req.body.diamond) === user.diamond)) {
      return res.status(200).json({ status: true, message: "Success", user });
    }

    const wallet = new Wallet();

    if (!Number.isNaN(Number(req.body.rCoin))) {
      if (user.rCoin > Number(req.body.rCoin)) {
        wallet.isIncome = false;
        wallet.rCoin = user.rCoin - Number(req.body.rCoin);
      } else {
        wallet.isIncome = true;
        wallet.rCoin = Number(req.body.rCoin) - user.rCoin;
      }
      user.rCoin = Number(req.body.rCoin);
    }

    if (!Number.isNaN(Number(req.body.diamond))) {
      if (user.diamond > Number(req.body.diamond)) {
        wallet.isIncome = false;
        wallet.diamond = user.diamond - Number(req.body.diamond);
      } else {
        wallet.isIncome = true;
        wallet.diamond = Number(req.body.diamond) - user.diamond;
      }

      user.diamond = Number(req.body.diamond);
    }

    wallet.userId = user._id;
    wallet.type = 8;
    wallet.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    await Promise.all([user.save(), wallet.save()]);

    return res.status(200).json({ status: true, message: "Success", user });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//check user plan is expired or not
exports.checkPlan = async (req, res) => {
  try {
    const user = await User.findById(req.query.userId);
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not exist!!" });
    }

    if (user.plan.planStartDate !== null && user.plan.planId !== null) {
      const plan = await VIPPlan.findById(user.plan.planId);
      if (!plan) {
        return res.status(200).json({ status: false, message: "Plan does not exist!!" });
      }

      if (plan.validityType.toLowerCase() === "day") {
        const diffTime = moment(new Date()).diff(moment(new Date(user.plan.planStartDate)), "day");
        if (diffTime > plan.validity) {
          user.isVIP = false;
          user.plan.planStartDate = null;
          user.plan.planId = null;
        }
      }
      if (plan.validityType.toLowerCase() === "month") {
        const diffTime = moment(new Date()).diff(moment(new Date(user.plan.planStartDate)), "month");
        if (diffTime >= plan.validity) {
          user.isVIP = false;
          user.plan.planStartDate = null;
          user.plan.planId = null;
        }
      }
      if (plan.validityType.toLowerCase() === "year") {
        const diffTime = moment(new Date()).diff(moment(new Date(user.plan.planStartDate)), "year");
        if (diffTime >= plan.validity) {
          user.isVIP = false;
          user.plan.planStartDate = null;
          user.plan.planId = null;
        }
      }
      await user.save();
    }

    if (user.liveJoinSvga || user.avatarFrame) {
      checkSvga(user._id);
    }

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error });
  }
};

exports.userUniqueId = async (req, res) => {
  try {
    const user = await User.find();

    user.map(async (res) => {
      var digits = Math.floor(Math.random() * 1005101) + 10000000;
      res.uniqueId = digits;
      await res.save();
    });

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//switch for enable diseble user live or not
exports.switchForEnableLiveUser = async (req, res) => {
  try {
    if (!req?.query?.userId) {
      return res.status(200).send({ status: false, message: "Invalid details" });
    }

    const user = await User.findById(req?.query?.userId);
    if (!user) {
      return res.status(200).send({ status: false, message: "user not exists" });
    }

    user.enableToLive = !user.enableToLive;
    await user.save();

    return res.status(200).send({ status: true, message: "success!!", user });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, message: "Internal server error" });
  }
};

//switch for block the user for game
exports.switchForGameBlock = async (req, res) => {
  try {
    if (!req?.query?.userId) {
      return res.status(200).send({ status: false, message: "Invalid details" });
    }

    const user = await User.findById(req?.query?.userId);
    if (!user) {
      return res.status(200).send({ status: false, message: "user not exists" });
    }

    user.gameBlock = !user.gameBlock;
    await user.save();

    return res.status(200).send({ status: true, message: "success!!", user });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, message: "Internal server error" });
  }
};

//add fake user for admin
exports.AddFakeUser = async (req, res) => {
  try {
    if (!req.query.fakeDataType) {
      deleteFiles(req.files);
      return res.status(200).json({ status: false, message: "fakeDataType must be requried." });
    }

    const [userNameExist, flag, level] = await Promise.all([
      User.findOne({
        username: { $regex: new RegExp(`^${req.body.username}$`, "i") },
      }),
      Flag.findOne({ name: req.body?.country?.trim() }),
      Level.find({}).sort({ coin: 1 }),
    ]);

    if (userNameExist) {
      deleteFiles(req.files);
      return res.status(200).json({
        status: false,
        message: "Username already taken!",
        user: {},
      });
    }

    const user = new User();

    const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let referralCode = "";
    for (let i = 0; i < 8; i++) {
      referralCode += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    user.referralCode = referralCode;
    user.name = req.body.name;
    user.gender = req.body.gender;
    user.age = req.body.age;

    if (req.query.fakeDataType == 0) {
      if (req.body.imageType == 0) {
        user.image = req.body.image ? req.body.image : null;
        user.imageType = req.body.imageType;
      }

      if (req.body.imageType == 1) {
        user.image = req.files.image ? config.baseURL + req.files.image[0].path : null;
        user.imageType = req.body.imageType;
      }

      if (req.body.linkType == 0) {
        user.link = req.body.link ? req.body.link : null;
        user.linkType = req.body.linkType;
      }

      if (req.body.linkType == 1) {
        user.link = req.files.link ? config.baseURL + req.files.link[0].path : null;
        user.linkType = req.body.linkType;
      }

      user.fakeDataType = 0;
    } else if (req.query.fakeDataType == 1) {
      if (req.body.imageType == 0) {
        user.image = req.body.image ? req.body.image : null;
        user.imageType = req.body.imageType;
      }

      if (req.body.imageType == 1) {
        user.imageType = req.body.imageType;

        if (req?.files?.pkImageArray) {
          const pkImageArrayData = [];

          await req?.files?.pkImageArray.map(async (data) => {
            await pkImageArrayData.push(config.baseURL + data.path);
          });

          user.pkImageArray = pkImageArrayData;
        }
      }

      if (req.body.linkType == 0) {
        user.link = req.body.link ? req.body.link : null;
        user.linkType = req.body.linkType;
      }

      if (req.body.linkType == 1) {
        console.log("linkType 1");

        user.linkType = req.body.linkType;

        if (req?.files?.pkVideoArray) {
          const pkVideoArrayData = [];

          await req?.files?.pkVideoArray.map(async (data) => {
            await pkVideoArrayData.push(config.baseURL + data.path);
          });

          user.pkVideoArray = pkVideoArrayData;
        }
      }

      user.fakeDataType = 1;
    } else if (req.query.fakeDataType == 2) {
      if (req.body.imageType == 0) {
        user.image = req.body.image ? req.body.image : null;
        user.imageType = req.body.imageType;
      }

      if (req.body.imageType == 1) {
        user.image = req.files.image ? config.baseURL + req.files.image[0].path : null;
        user.imageType = req.body.imageType;
      }

      user.roomName = req?.body?.roomName ? req?.body?.roomName.trim() : user.roomName;
      user.roomWelcome = req?.body?.roomWelcome ? req?.body?.roomWelcome.trim() : user.roomWelcome;
      user.roomImage = req.files.roomImage ? config?.baseURL + req.files.roomImage[0].path : user.roomImage;

      user.fakeDataType = 2;
    } else {
      deleteFiles(req.files);
      return res.status(200).json({ status: false, message: "fakeDataType must be passed valid." });
    }

    user.bio = req.body.bio ? req.body.bio : null;
    user.country = req.body.country;
    user.countryFlagImage = flag?.flag;
    user.ip = req.body.ip ? req.body.ip : null;
    user.identity = req.body.identity ? req.body.identity : null;
    user.loginType = 3;
    user.analyticDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    user.username = req.body.username.trim();
    user.email = req.body.email;
    user.level = level.length && level[0]?._id;
    user.isFake = true;
    await user.save();

    return res.status(200).send({
      status: true,
      message: "Success",
      user,
    });
  } catch (error) {
    deleteFiles(req.files);
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//update fake user for admin
exports.updateFakeUser = async (req, res) => {
  try {
    const [user, userNameExist, flag, level] = await Promise.all([
      User.findOne({ _id: req.query.userId, isFake: true }),
      User.exists({
        _id: { $ne: new mongoose.Types.ObjectId(req.query.userId) },
        username: { $regex: new RegExp(`^${req.body?.username}$`, "i") },
      }),
      Flag.findOne({ name: req.body?.country?.trim() }),
      Level.find({}).sort({ coin: 1 }),
    ]);

    if (!user) {
      deleteFiles(req.files);
      return res.status(200).json({
        status: false,
        message: "user dose not found.",
        user: {},
      });
    }

    if (userNameExist) {
      deleteFiles(req.files);
      return res.status(200).json({
        status: false,
        message: "Username Already Exists !!.",
        user: {},
      });
    }

    user.analyticDate = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    user.name = req.body.name ? req.body.name : user.name;
    user.gender = req.body.gender ? req.body.gender : user.gender;
    user.age = req.body.age ? req.body.age : user.age;
    user.bio = req.body.bio ? req.body.bio : user.bio;

    if ((req.body.image && req.body.imageType == 0) || (req.files.image && req.body.imageType == 1)) {
      if (user.imageType == 1) {
        var image_ = user.image?.split("storage");
        if (image_) {
          if (fs.existsSync("storage" + image_[1])) {
            fs.unlinkSync("storage" + image_[1]);
          }
        }
      }

      if (req.body.imageType == 0) {
        user.image = req.body?.image;
      } else {
        user.image = config.baseURL + req.files?.image[0].path;
      }

      user.imageType = req.body.imageType;
    }

    if ((req.body.link && req.body.linkType == 0) || (req.files.link && req.body.linkType == 1)) {
      if (user.linkType == 1) {
        var link_ = user.link?.split("storage");
        if (link_) {
          if (fs.existsSync("storage" + link_[1])) {
            fs.unlinkSync("storage" + link_[1]);
          }
        }
      }

      if (req.body.linkType == 0) {
        user.link = req.body?.link;
      } else {
        user.link = config.baseURL + req.files?.link[0].path;
      }

      user.linkType = req.body.linkType;
    }

    if (req.query.fakeDataType == 1) {
      if (req?.files?.pkVideoArray) {
        //for delete existing pkVideoArray
        if (user.pkVideoArray.length > 0) {
          for (var i = 0; i < user.pkVideoArray.length; i++) {
            const pkVideoArray = user.pkVideoArray[i].split("storage");
            if (pkVideoArray) {
              if (fs.existsSync("storage" + pkVideoArray[1])) {
                fs.unlinkSync("storage" + pkVideoArray[1]);
              }
            }
          }
        }

        var pkVideoArrayData = [];

        await req?.files?.pkVideoArray.map(async (data) => {
          await pkVideoArrayData.push(config.baseURL + data.path);
        });

        user.pkVideoArray = pkVideoArrayData;
      }

      if (req?.files?.pkImageArray) {
        //for delete existing pkImageArray
        if (user.pkImageArray.length > 0) {
          for (var i = 0; i < user.pkImageArray.length; i++) {
            const pkImageArray = user.pkImageArray[i].split("storage");
            if (pkImageArray) {
              if (fs.existsSync("storage" + pkImageArray[1])) {
                fs.unlinkSync("storage" + pkImageArray[1]);
              }
            }
          }
        }

        var pkImageArrayData = [];

        await req?.files?.pkImageArray.map(async (data) => {
          await pkImageArrayData.push(config.baseURL + data.path);
        });

        user.pkImageArray = pkImageArrayData;
      }
    }

    if (req.body.country) {
      user.country = req.body.country;
      user.countryFlagImage = flag?.flag;
    }

    user.username = req.body.username ? req.body.username.trim() : user.username;
    user.email = req.body.email ? req.body.email.trim() : user.email;

    user.roomName = req?.body?.roomName ? req?.body?.roomName.trim() : user.roomName;
    user.roomWelcome = req?.body?.roomWelcome ? req?.body?.roomWelcome.trim() : user.roomWelcome;

    if (req.files.roomImage) {
      const roomImage = user?.roomImage?.split("storage");
      if (roomImage) {
        if (fs.existsSync("storage" + roomImage[1])) {
          fs.unlinkSync("storage" + roomImage[1]);
        }
      }

      user.roomImage = req.files.roomImage ? config?.baseURL + req.files.roomImage[0].path : user.roomImage;
    }

    await user.save();

    return res.status(200).send({
      status: true,
      message: "Success",
      user,
    });
  } catch (error) {
    deleteFiles(req.files);
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get all users with only uniqueId (for create coinSeller dropdown)
exports.getUsersUniqueId = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    if (req.query.search) {
      const users = await User.aggregate([
        { $addFields: { searchUniqueId: { $toString: "$uniqueId" } } },
        {
          $match: { isFake: false },
        },
        {
          $match: {
            searchUniqueId: { $regex: req.query.search, $options: "i" },
          },
        },
        {
          $project: {
            uniqueId: 1,
            image: 1,
          },
        },
      ]);

      return res.status(200).json({ status: true, message: "Success", data: users });
    } else {
      const users = await User.find({ isFake: false })
        .select("uniqueId image")
        .skip((start - 1) * limit)
        .limit(limit);

      return res.status(200).json({ status: true, message: "Success", data: users });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};

exports.getUsersUniqueIdForAgency = async (req, res) => {
  try {
    if (req.query.search) {
      const users = await User.aggregate([
        { $addFields: { searchUniqueId: { $toString: "$uniqueId" } } },
        {
          $match: {
            searchUniqueId: { $regex: req.query.search, $options: "i" },
            isHost: false,
            isAgency: false,
          },
        },
        {
          $project: {
            uniqueId: 1,
            image: 1,
          },
        },
      ]);

      return res.status(200).json({ status: true, message: "Success", data: users });
    } else {
      const users = [];

      return res.status(200).json({ status: true, message: "Success", data: users });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error",
    });
  }
};
