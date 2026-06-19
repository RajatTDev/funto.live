const ChatTopic = require("./chatTopic.model");
const Chat = require("../../server/chat/chat.model");
const User = require("../user/user.model");
const Block = require("../block/block.model");

const arrayShuffle = require("shuffle-array");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");
const mongoose = require("mongoose");
const fs = require("fs");

dayjs.extend(utc); // Extend dayjs with utc plugin
dayjs.extend(timezone);

exports.store = async (req, res) => {
  try {
    if (!req.body.senderUserId || !req.body.receiverUserId) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const [senderUser, receiverUser, chatTopic] = await Promise.all([
      User.findById(req.body.senderUserId),
      User.findById(req.body.receiverUserId),
      ChatTopic.findOne({
        $or: [
          {
            $and: [{ senderUser: req.body.senderUserId }, { receiverUser: req.body.receiverUserId }],
          },
          {
            $and: [{ receiverUser: req.body.senderUserId }, { senderUser: req.body.receiverUserId }],
          },
        ],
      }),
    ]);

    if (!senderUser) return res.status(200).json({ status: false, message: "User does not Exist!" });
    if (!receiverUser) return res.status(200).json({ status: false, message: "User dose not Exist!" });

    if (chatTopic) {
      return res.status(200).json({ status: true, message: "Success", chatTopic });
    }

    const newChatTopic = new ChatTopic();
    newChatTopic.senderUser = senderUser._id;
    newChatTopic.receiverUser = receiverUser._id;

    await newChatTopic.save();

    return res.status(200).json({ status: true, message: "Success", chatTopic: newChatTopic });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message || "Internal Server Error !",
    });
  }
};

exports.getChatList = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    const userId = new mongoose.Types.ObjectId(req.query.userId);

    const [user, blockedUserIds] = await Promise.all([
      User.findById(userId).select("_id").lean(),
      Block.distinct("toUserId", { userId: userId }), // Fetch only toUserId values directly
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not exist!" });
    }

    const [list, fakeData] = await Promise.all([
      ChatTopic.aggregate([
        {
          $match: {
            $or: [{ senderUser: userId }, { receiverUser: userId }],
          },
        },
        {
          $lookup: {
            from: "users",
            let: { receiverUserIds: "$receiverUser", senderUserIds: "$senderUser" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $cond: {
                      if: { $eq: ["$$senderUserIds", userId] },
                      then: { $eq: ["$$receiverUserIds", "$_id"] },
                      else: { $eq: ["$$senderUserIds", "$_id"] },
                    },
                  },
                },
              },
              {
                $project: {
                  name: 1,
                  username: 1,
                  avatarFrameImage: 1,
                  image: 1,
                  country: 1,
                  isVIP: 1,
                  isFake: 1,
                  countryFlagImage: 1,
                  isOnline: 1,
                },
              },
            ],
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: {
            "user._id": { $nin: blockedUserIds },
          },
        },
        {
          $lookup: {
            from: "chats",
            localField: "_id",
            foreignField: "topic",
            as: "chatMessages",
          },
        },
        {
          $addFields: {
            lastMessage: { $arrayElemAt: ["$chatMessages", -1] }, // Get latest message
            unreadCount: {
              $size: {
                $filter: {
                  input: "$chatMessages",
                  as: "chat",
                  cond: {
                    $and: [
                      { $eq: ["$$chat.isRead", false] },
                      { $ne: ["$$chat.senderId", userId.toString()] }, // Only unread from other users
                    ],
                  },
                },
              },
            },
          },
        },
        {
          $sort: { "lastMessage.createdAt": -1 }, // Sort by latest message
        },
        {
          $project: {
            topic: "$_id",
            userId: "$user._id",
            name: "$user.name",
            username: "$user.username",
            avatarFrameImage: "$user.avatarFrameImage",
            image: "$user.image",
            country: "$user.country",
            isVIP: "$user.isVIP",
            isFake: "$user.isFake",
            isOnline: "$user.isOnline",
            countryFlagImage: "$user.countryFlagImage",
            message: "$lastMessage.message",
            date: "$lastMessage.date",
            createdAt: "$lastMessage.createdAt",
            unreadCount: 1,
          },
        },
        { $skip: start },
        { $limit: limit },
      ]),
      User.aggregate([{ $match: { isFake: true } }, { $sample: { size: 5 } }]),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    let now = dayjs();
    const chatList = list.map((data) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") === 0
          ? "Just Now"
          : now.diff(data.createdAt, "minute") <= 60
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? dayjs(data.createdAt).format("DD MMM, YYYY")
          : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    if (!settingJSON.isFake) {
      return res.status(200).json({
        status: true,
        message: "Success",
        chatList: chatList,
      });
    } else {
      const fakeUser = fakeData;
      const fakeStart = start - list.length;
      const fakeLimit = Math.min(limit, fakeUser.length - fakeStart + 1);

      const fakeChatList = fakeUser.slice(fakeStart, fakeStart + fakeLimit).map((element) => ({
        topic: null,
        message: "Hello",
        date: null,
        unreadCount: 0,
        userId: element._id,
        name: element.name,
        username: element.username,
        image: element.image,
        avatarFrameImage: element.avatarFrameImage,
        country: element.country,
        countryFlagImage: element.countryFlagImage,
        isVIP: element.isVIP,
        link: element.link,
        time: "Just now",
        isFake: true,
      }));

      return res.status(200).json({
        status: true,
        message: "Success",
        chatList: [...chatList, ...fakeChatList],
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

exports.deleteAllChatsAndTopics = async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(200).json({ status: false, message: "userId must be requried!" });
    }

    const [user, chatTopics] = await Promise.all([
      User.findById(userId).select("_id").lean(),
      ChatTopic.find({
        $or: [{ senderUser: userId }, { receiverUser: userId }],
      })
        .lean()
        .select("_id chat"),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User not found!" });
    }

    if (!chatTopics.length) {
      return res.status(200).json({ status: false, message: "No chats found for the user!" });
    }

    res.status(200).json({ status: true, message: "All chats and chat topics deleted successfully!" });

    const topicIds = chatTopics.map((topic) => topic._id);

    const chats = await Chat.find({ topic: { $in: topicIds } })
      .lean()
      .select("_id image");

    for (const chat of chats) {
      if (chat.image && fs.existsSync(chat.image)) {
        fs.unlinkSync(chat.image);
      }
    }

    await Chat.deleteMany({ topic: { $in: topicIds } });
    await ChatTopic.deleteMany({ _id: { $in: topicIds } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message });
  }
};
