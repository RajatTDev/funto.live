const Follower = require("./follower.model");
const User = require("../user/user.model");
const LiveStreamingHistory = require("../liveStreamingHistory/liveStreamingHistory.model");
const Block = require("../block/block.model");

const mongoose = require("mongoose");

//private key
const admin = require("../../util/privateKey");

exports.followUnFollow = async (req, res) => {
  try {
    if (!req.body.fromUserId || !req.body.toUserId) return res.status(200).json({ status: false, message: "Invalid Details!" });
    if (req.body.fromUserId == req.body.toUserId) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const [fromUserExist, toUserExist, followUser] = await Promise.all([
      User.findById(req.body.fromUserId),
      User.findById(req.body.toUserId),
      Follower.findOne({
        $and: [
          {
            fromUserId: req.body.fromUserId,
            toUserId: req.body.toUserId,
          },
        ],
      }),
    ]);

    if (!fromUserExist) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    if (!toUserExist) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    if (followUser) {
      await followUser.deleteOne();

      console.log("unFollowed Done ");

      res.status(200).send({
        status: true,
        message: "User unFollowed successfully!!",
        isFollow: false,
      });

      const [] = await Promise.all([
        User.updateOne({ _id: fromUserExist._id, following: { $gt: 0 } }, { $inc: { following: -1 } }),
        User.updateOne({ _id: toUserExist._id, followers: { $gt: 0 } }, { $inc: { followers: -1 } }),
      ]);
    } else {
      await Promise.all([
        Follower({
          fromUserId: fromUserExist._id,
          toUserId: toUserExist._id,
        }).save(),
        LiveStreamingHistory.updateOne(
          { _id: req.body?.liveStreamingId },
          {
            $inc: { fans: 1 },
          }
        ),
      ]);

      res.status(200).send({
        status: true,
        message: "User followed successfully!!",
        isFollow: true,
      });

      await Promise.all([User.updateOne({ _id: fromUserExist._id }, { $inc: { following: 1 } }), User.updateOne({ _id: toUserExist._id }, { $inc: { followers: 1 } })]);

      console.log("toUserExist: ", toUserExist);

      if (toUserExist && !toUserExist.isBlock && toUserExist.notification.newFollow && toUserExist.fcmToken !== "" && toUserExist.fcmToken !== null) {
        const adminPromise = await admin;

        const payload = {
          token: toUserExist.fcmToken,
          notification: {
            body: `${fromUserExist.name} started following you.`,
            title: "New Follower",
          },
          data: {
            data: String(fromUserExist._id),
            type: "USER",
          },
        };

        adminPromise
          .messaging()
          .send(payload)
          .then((response) => {
            console.log("Successfully sent with response: ", response);
          })
          .catch((error) => {
            console.log("Error sending message:      ", error);
          });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.followerList = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.body.userId);

    const [user, blockedUserIds] = await Promise.all([User.findById(userId).select("_id").lean(), Block.distinct("toUserId", { userId: userId })]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not exist!" });
    }

    const [data] = await Promise.all([
      Follower.aggregate([
        {
          $match: { toUserId: new mongoose.Types.ObjectId(req.body?.userId) },
        },
        {
          $lookup: {
            from: "users",
            localField: "fromUserId",
            foreignField: "_id",
            as: "followers",
          },
        },
        {
          $unwind: {
            path: "$followers",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: {
            "followers._id": { $nin: blockedUserIds },
          },
        },
        {
          $lookup: {
            from: "levels",
            localField: "followers.level",
            foreignField: "_id",
            as: "level",
          },
        },
        {
          $unwind: {
            path: "$level",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $project: {
            userId: "$followers._id",
            name: "$followers.name",
            username: "$followers.username",
            gender: "$followers.gender",
            age: "$followers.age",
            image: "$followers.image",
            country: "$followers.country",
            bio: "$followers.bio",
            followers: "$followers.followers",
            following: "$followers.following",
            video: "$followers.video",
            post: "$followers.post",
            level: "$level",
            isVIP: "$followers.isVIP",
          },
        },
        {
          $lookup: {
            from: "followers",
            let: { followerId: "$userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      {
                        $eq: ["$fromUserId", new mongoose.Types.ObjectId(req.body?.userId)],
                      },
                      { $eq: ["$toUserId", "$$followerId"] },
                    ],
                  },
                },
              },
            ],
            as: "followStatus",
          },
        },
        {
          $addFields: {
            isFollow: { $gt: [{ $size: "$followStatus" }, 0] },
          },
        },
        { $skip: req.body.start ? parseInt(req.body.start) : 0 }, // how many records you want to skip
        { $limit: req.body.limit ? parseInt(req.body.limit) : 20 },
      ]),
    ]);

    return res.status(200).json({ status: true, message: "Success!!", user: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.followingList = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.body.userId);

    const [user, blockedUserIds] = await Promise.all([User.findById(userId).select("_id").lean(), Block.distinct("toUserId", { userId: userId })]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not exist!" });
    }

    const [following] = await Promise.all([
      Follower.aggregate([
        {
          $match: { fromUserId: new mongoose.Types.ObjectId(req.body.userId) },
        },
        {
          $lookup: {
            from: "users",
            localField: "toUserId",
            foreignField: "_id",
            as: "following",
          },
        },
        {
          $unwind: {
            path: "$following",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: {
            "following._id": { $nin: blockedUserIds },
          },
        },
        {
          $lookup: {
            from: "levels",
            localField: "following.level",
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
          $project: {
            userId: "$following._id",
            name: "$following.name",
            username: "$following.username",
            gender: "$following.gender",
            age: "$following.age",
            image: "$following.image",
            country: "$following.country",
            countryFlagImage: "$following.countryFlagImage",
            bio: "$following.bio",
            followers: "$following.followers",
            following: "$following.following",
            video: "$following.video",
            post: "$following.post",
            level: "$level",
            isVIP: "$following.isVIP",
          },
        },
        { $addFields: { isFollow: true } },
        { $skip: req.body.start ? parseInt(req.body.start) : 0 }, // how many records you want to skip
        { $limit: req.body.limit ? parseInt(req.body.limit) : 20 },
      ]),
    ]);

    console.log("following: ", following);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      user: following,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get users followers & following list (for admin panel)
exports.followerFollowing = async (req, res) => {
  try {
    if (req.query.type === "following") {
      const [user, following] = await Promise.all([User.findById(req.query.userId), Follower.find({ fromUserId: req.query.userId }).populate("toUserId")]);

      if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });
      if (!following) return res.status(200).json({ status: false, message: "Data not found" });

      return res.status(200).json({ status: true, message: "Success!!", follow: following });
    } else {
      const [user, follower] = await Promise.all([User.findById(req.query.userId), Follower.find({ toUserId: req.query.userId }).populate("fromUserId")]);

      if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });
      if (!follower) return res.status(200).json({ status: false, message: "Data not found" });

      return res.status(200).json({ status: true, message: "Success!!", follow: follower });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
