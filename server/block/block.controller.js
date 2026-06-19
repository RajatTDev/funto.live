const Block = require("../../server/block/block.model");
const User = require("../../server/user/user.model");
const FollowerFollowing = require("../../server/follower/follower.model");

const mongoose = require("mongoose");

exports.blockOrUnblockUser = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Invalid request. userId is required." });
    }

    if (!req.query.toUserId) {
      return res.status(200).json({ status: false, message: "Invalid request. toUserId is required." });
    }

    const userId = new mongoose.Types.ObjectId(req.query.userId);
    const toUserId = new mongoose.Types.ObjectId(req.query.toUserId);

    const [user, toUser, existingBlock] = await Promise.all([
      User.findById(userId).select("_id").lean(),
      User.findById(toUserId).select("_id").lean(),
      Block.findOne({ userId, toUserId }).select("_id").lean(),
    ]);

    if (!user) return res.status(200).json({ status: false, message: "User not found." });
    if (!toUser) return res.status(200).json({ status: false, message: "Target user not found." });

    if (existingBlock) {
      await Block.deleteOne({ userId, toUserId });

      return res.status(200).json({
        status: true,
        message: "User unblocked successfully.",
        isBlocked: false,
      });
    } else {
      await Promise.all([
        new Block({ userId, toUserId }).save(),
        FollowerFollowing.deleteOne({ followerId: userId, followingId: toUserId }), // Optional: Unfollow if blocked
      ]);

      return res.status(200).json({
        status: true,
        message: "User blocked successfully.",
        isBlocked: true,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

exports.getBlockedUsers = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Invalid request. userId is required." });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [total, blockedUsers] = await Promise.all([
      Block.countDocuments({ userId }),
      Block.find({ userId })
        .select("toUserId")
        .populate("toUserId", "name username image countryFlagImage country")
        .skip((start - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      status: true,
      message: blockedUsers.length > 0 ? "Blocked users retrieved successfully." : "No blocked users found.",
      total,
      blockedUsers,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

exports.getUsersWhoBlockedMe = async (req, res) => {
  try {
    if (!req.query.userId) {
      return res.status(200).json({ status: false, message: "Invalid request. userId is required." });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [total, blockedByUsers] = await Promise.all([
      Block.countDocuments({ toUserId: userId }),
      Block.find({ toUserId: userId })
        .select("userId")
        .populate("userId", "name username image countryFlagImage country")
        .skip((start - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      status: true,
      message: blockedByUsers.length > 0 ? "Users who blocked you retrieved successfully." : "No users have blocked you.",
      total,
      blockedByUsers,
    });
  } catch (error) {
    console.error("Error in getUsersWhoBlockedMe:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};
