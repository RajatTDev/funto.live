const Video = require("./video.model");
const User = require("../user/user.model");
const Hashtag = require("../hashtag/hashtag.model");
const Song = require("../song/song.model");
const Favorite = require("../favorite/favorite.model");
const Comment = require("../comment/comment.model");
const Block = require("../block/block.model");

const config = require("../../config");

const fs = require("fs");
const mongoose = require("mongoose");

const { deleteFile } = require("../../util/deleteFile");

// index
exports.index = async (req, res) => {
  try {
    if (req.query.userId) {
      const [user, video] = await Promise.all([
        User.findById(req.query.userId),
        Video.find({
          userId: req.query.userId,
          // isDelete: false,
        }),
      ]);

      if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

      return res.status(200).json({ status: true, message: "Success!!", video });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    let dateFilterQuery = {};
    let searchQuery = {};

    if (req.query.startDate !== "ALL" && req.query.endDate !== "ALL") {
      const parseDate = (dateString) => {
        const [year, month, day] = dateString.split(/[-/]/).map(Number);
        return new Date(Date.UTC(year, month - 1, day));
      };

      const sDate = parseDate(req.query.startDate);
      const eDate = parseDate(req.query.endDate);

      dateFilterQuery = {
        analyticDate: {
          $gte: new Date(sDate),
          $lte: new Date(eDate),
        },
      };
    }

    if (req.query.search) {
      searchQuery = {
        $or: [{ idStr: { $regex: req.query.search, $options: "i" } }, { location: { $regex: req.query.search, $options: "i" } }, { "userId.username": { $regex: req.query.search, $options: "i" } }],
      };
    }
    let query;
    if (req.query.type === "Fake") {
      query = {
        isFake: true,
      };
    } else {
      query = {
        isFake: false,
      };
    }

    const video = await Video.aggregate([
      {
        $match: { isDelete: false, ...query },
      },

      {
        $sort: { _id: -1 },
      },
      {
        $lookup: {
          from: "users",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$$userId", "$_id"] } },
            },
            // {
            //   $project: {
            //     name: 1,
            //     username: 1,
            //     image: 1,
            //   },
            // },
          ],
          as: "userId",
        },
      },
      {
        $unwind: {
          path: "$userId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          analyticDate: {
            $toDate: { $arrayElemAt: [{ $split: ["$date", ", "] }, 0] },
          },
          idStr: { $toString: "$userId.uniqueId" },
        },
      },
      {
        $match: { ...dateFilterQuery, ...searchQuery },
      },
      {
        $lookup: {
          from: "songs",
          let: { songId: "$song" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$$songId", "$_id"] } },
            },
            {
              $project: {
                song: 1,
              },
            },
          ],
          as: "song",
        },
      },
      {
        $unwind: {
          path: "$song",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $facet: {
          video: [
            { $skip: (start - 1) * limit }, // how many records you want to skip
            { $limit: limit },
          ],
          pageInfo: [
            { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
          ],
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      total: video[0].pageInfo.length > 0 ? video[0].pageInfo[0].totalRecord : 0,
      video: video[0].video,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// create video
exports.uploadVideo = async (req, res) => {
  try {
    if (!req.files.video || !req.body.userId || !req.files.screenshot) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const user = await User.findById(req.body.userId);

    if (!user) {
      if (req.files.video) deleteFile(req.files.video[0]);
      if (req.files.screenshot) deleteFile(req.files.screenshot[0]);
      if (req.files.thumbnail) deleteFile(req.files.thumbnail[0]);
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    let song;

    if (req.body.songId) {
      song = await Song.findById(req.body.songId);

      if (!song) {
        if (req.files.video) deleteFile(req.files.video[0]);
        if (req.files.screenshot) deleteFile(req.files.screenshot[0]);
        if (req.files.thumbnail) deleteFile(req.files.thumbnail[0]);
        return res.status(200).json({ status: false, message: "Song does not Exist!" });
      }
    }

    var removeComa = req.body.hashtag.replace(/,\s*$/, "");

    var hashtagList = removeComa.split(",");

    if (hashtagList.length > 0) {
      hashtagList.map(async (hashtag) => {
        const h = hashtag.toLowerCase();
        if (h !== "" && h !== " ") {
          try {
            await Hashtag.findOneAndUpdate({ hashtag: h }, {}, { upsert: true });
          } catch (err) {
            console.log(err);
          }
        }
      });
    }

    const video = new Video();

    video.userId = user._id;
    video.video = config.baseURL + req.files.video[0].path;
    video.hashtag = hashtagList;
    video.location = req.body.location;
    video.caption = req.body.caption;
    video.mentionPeople = req.body.mentionPeople;
    video.isOriginalAudio = req.body.isOriginalAudio;
    video.showVideo = parseInt(req.body.showVideo);
    video.allowComment = req.body.allowComment;
    video.duration = req.body.duration;
    video.size = req.body.size;
    video.thumbnail = req.files.thumbnail ? config.baseURL + req.files.thumbnail[0].path : null;
    video.screenshot = req.files.screenshot ? config.baseURL + req.files.screenshot[0].path : null;
    video.song = !song ? null : song._id;
    video.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    await video.save();

    user.video += 1;
    await user.save();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    if (req.files.video) deleteFile(req.files.video[0]);
    if (req.files.screenshot) deleteFile(req.files.screenshot[0]);
    if (req.files.thumbnail) deleteFile(req.files.thumbnail[0]);
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get video list
exports.getVideo = async (req, res) => {
  try {
    if (!req.query.userId) return res.status(200).json({ status: false, message: "Oops Invalid Details !!" });

    let query = {};
    if (req.query.type !== "ALL") {
      query = { userId: new mongoose.Types.ObjectId(req.query.userId) };
    }

    const start = req.query.start ? parseInt(req.query.start) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const [user, blockedUserIds] = await Promise.all([
      User.findById(new mongoose.Types.ObjectId(req.query.userId)).select("_id").lean(),
      Block.distinct("toUserId", { userId: new mongoose.Types.ObjectId(req.query.userId) }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not exist!" });
    }

    const [fakeVideo, video] = await Promise.all([
      Video.aggregate([
        {
          $match: { ...query, isDelete: false, isFake: true },
        },
        {
          $lookup: {
            from: "followers",
            let: { authorId: "$user._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$fromUserId", new mongoose.Types.ObjectId(req.query.userId)] }, { $eq: ["$toUserId", "$$authorId"] }],
                  },
                },
              },
            ],
            as: "followDoc",
          },
        },
        {
          $lookup: {
            from: "favorites",
            let: {
              videoId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$video", "$$videoId"] },
                      {
                        $eq: ["$user", new mongoose.Types.ObjectId(req.query.userId)],
                      },
                    ],
                  },
                },
              },
            ],
            as: "favorite",
          },
        },
        {
          $unwind: {
            path: "$favorite",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
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
          $lookup: {
            from: "comments",
            as: "comment",
            let: {
              videoId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$video", "$$videoId"],
                  },
                },
              },
              {
                $lookup: {
                  from: "users",
                  localField: "userId",
                  foreignField: "_id",
                  as: "userId",
                },
              },
              {
                $unwind: { path: "$userId", preserveNullAndEmptyArrays: false },
              },
              { $match: { "userId.isBlock": false } },
            ],
          },
        },
        { $match: { "user.isBlock": false } },
        {
          $project: {
            userId: "$user._id",
            name: "$user.name",
            username: "$user.username",
            userImage: "$user.image",
            country: "$user.country",
            countryFlagImage: "$user.countryFlagImage",
            avatarFrameImage: "$user.avatarFrameImage",
            isVIP: "$user.isVIP",
            isOriginalAudio: 1,
            like: 1,
            comment: { $size: "$comment" },
            allowComment: 1,
            showVideo: 1,
            userId: 1,
            video: 1,
            isFake: 1,
            location: 1,
            caption: 1,
            thumbnail: 1,
            screenshot: 1,
            isDelete: 1,
            date: 1,
            isLike: {
              $cond: [
                {
                  $eq: [new mongoose.Types.ObjectId(req.query.userId), "$favorite.user"],
                },
                true,
                false,
              ],
            },
            isFollow: { $gt: [{ $size: "$followDoc" }, 0] },
            hashtag: 1,
            mentionPeople: 1,
            song: null,
          },
        },
      ]),
      Video.aggregate([
        {
          $match: {
            isDelete: false,
            isFake: false,
            userId: { $nin: blockedUserIds },
            ...query,
          },
        },
        {
          $lookup: {
            from: "followers",
            let: { authorId: "$user._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$fromUserId", new mongoose.Types.ObjectId(req.query.userId)] }, { $eq: ["$toUserId", "$$authorId"] }],
                  },
                },
              },
            ],
            as: "followDoc",
          },
        },
        {
          $lookup: {
            from: "favorites",
            let: {
              videoId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$video", "$$videoId"] },
                      {
                        $eq: ["$user", new mongoose.Types.ObjectId(req.query.userId)],
                      },
                    ],
                  },
                },
              },
            ],
            as: "favorite",
          },
        },
        {
          $unwind: {
            path: "$favorite",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "songs",
            localField: "song",
            foreignField: "_id",
            as: "song",
          },
        },
        {
          $unwind: {
            path: "$song",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: false,
          },
        },
        { $match: { "user.isBlock": false } },
        {
          $project: {
            userId: "$user._id",
            name: "$user.name",
            username: "$user.username",
            userImage: "$user.image",
            country: "$user.country",
            countryFlagImage: "$user.countryFlagImage",
            avatarFrameImage: "$user.avatarFrameImage",
            isVIP: "$user.isVIP",
            isOriginalAudio: 1,
            like: 1,
            comment: 1,
            allowComment: 1,
            showVideo: 1,
            userId: 1,
            video: 1,
            isFake: 1,
            location: 1,
            caption: 1,
            thumbnail: 1,
            screenshot: 1,
            isDelete: 1,
            date: 1,
            isLike: {
              $cond: [
                {
                  $eq: [new mongoose.Types.ObjectId(req.query.userId), "$favorite.user"],
                },
                true,
                false,
              ],
            },
            isFollow: { $gt: [{ $size: "$followDoc" }, 0] },
            hashtag: 1,
            mentionPeople: 1,
            song: { $ifNull: ["$song", null] },
          },
        },
      ]),
    ]);

    if (settingJSON?.isFake) {
      const combinedVideos = [...video, ...fakeVideo].sort(() => 0.5 - Math.random());
      //.sort((a, b) => new Date(b.date) - new Date(a.date));

      const startIndex = start * limit;
      const endIndex = startIndex + limit;

      const paginatedVideos = combinedVideos.slice(startIndex, endIndex);

      return res.status(200).json({
        status: true,
        message: "Success",
        video: paginatedVideos,
      });
    } else {
      const realVideos = video.sort(() => 0.5 - Math.random());
      //.sort((a, b) => new Date(b.date) - new Date(a.date));

      const startIndex = start * limit;
      const endIndex = startIndex + limit;

      const paginatedVideos = realVideos.slice(startIndex, endIndex);

      return res.status(200).json({
        status: true,
        message: "Success",
        video: paginatedVideos,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get video by id
exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(req.query.videoId) },
      },
      {
        $lookup: {
          from: "favorites",
          let: {
            videoId: "$_id",
            userId: "$userId",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$video", "$$videoId"] }, { $eq: ["$user", "$$userId"] }],
                },
              },
            },
          ],
          as: "favorite",
        },
      },
      {
        $unwind: {
          path: "$favorite",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "songs",
          localField: "song",
          foreignField: "_id",
          as: "song",
        },
      },
      {
        $unwind: {
          path: "$song",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: {
          path: "$user",
          preserveNullAndEmptyArrays: false,
        },
      },
      { $match: { "user.isBlock": false } },
      {
        $sort: { date: -1 },
      },
      {
        $project: {
          userId: "$user._id",
          name: "$user.name",
          userImage: "$user.image",
          avatarFrameImage: "$user.avatarFrameImage",
          isVIP: "$user.isVIP",
          isOriginalAudio: 1,
          like: 1,
          comment: 1,
          allowComment: 1,
          showVideo: 1,
          userId: 1,
          video: 1,
          location: 1,
          caption: 1,
          thumbnail: 1,
          screenshot: 1,
          isDelete: 1,
          isLike: {
            $cond: [{ $eq: ["$user._id", "$favorite.user"] }, true, false],
          },
          hashtag: 1,
          mentionPeople: 1,
          song: { $ifNull: ["$song", null] },
        },
      },
      { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
      { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
    ]);

    return res.status(200).json({
      status: video.length > 0 ? true : false,
      message: video.length > 0 ? "Success!!" : "Video does not Exist !",
      video: video,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// delete video
exports.destroy = async (req, res) => {
  try {
    const video = await Video.findById(req.query.videoId);
    if (!video) return res.status(200).json({ status: false, message: "Video does not Exist!" });

    if (fs.existsSync(video.video)) {
      fs.unlinkSync(video.video);
    }
    if (fs.existsSync(video.thumbnail)) {
      fs.unlinkSync(video.thumbnail);
    }
    if (fs.existsSync(video.screenshot)) {
      fs.unlinkSync(video.screenshot);
    }

    Comment.deleteMany({ video: video._id });
    Favorite.deleteMany({ video: video._id });

    video.comment = 0;
    video.like = 0;

    video.isDelete = true;
    await video.save();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// allow disallow comment on V Shorts [frontend]
exports.allowDisallowComment = async (req, res) => {
  try {
    const video = await Video.findById(req.params.videoId).populate("userId song");
    if (!video) return res.status(200).json({ status: false, message: "Video does not Exist!" });

    video.allowComment = !video.allowComment;
    await video.save();

    return res.status(200).json({ status: true, message: "Success!!", video });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// create Fake video
exports.uploadFakeVideo = async (req, res) => {
  try {
    if (!req.body.userId || !req.files.screenshot) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const user = await User.findById(req.body.userId);

    if (!user) {
      if (req.files.video) deleteFile(req.files.video[0]);
      if (req.files.screenshot) deleteFile(req.files.screenshot[0]);
      if (req.files.thumbnail) deleteFile(req.files.thumbnail[0]);
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    let song;

    if (req.body.songId) {
      song = await Song.findById(req.body.songId);

      if (!song) {
        if (req.files.video) deleteFile(req.files.video[0]);
        if (req.files.screenshot) deleteFile(req.files.screenshot[0]);
        if (req.files.thumbnail) deleteFile(req.files.thumbnail[0]);
        return res.status(200).json({ status: false, message: "Song does not Exist!" });
      }
    }

    var removeComa = req.body.hashtag.replace(/,\s*$/, "");

    var hashtagList = removeComa.split(",");

    if (hashtagList.length > 0) {
      hashtagList.map(async (hashtag) => {
        const h = hashtag.toLowerCase();
        if (h !== "" && h !== " ") {
          try {
            await Hashtag.findOneAndUpdate({ hashtag: h }, {}, { upsert: true });
          } catch (err) {
            console.log(err);
          }
        }
      });
    }

    const video = new Video();

    video.userId = user._id;

    if (req.body.fakeVideoType == 0) {
      video.video = req.body.video ? req.body.video : null;
      video.fakeVideoType = req.body.fakeVideoType ? req.body.fakeVideoType : null;
    }

    if (req.body.fakeVideoType == 1) {
      video.video = req.files.video ? config.baseURL + req.files.video[0].path : null;
      video.fakeVideoType = req.body.fakeVideoType ? req.body.fakeVideoType : null;
    }

    video.hashtag = hashtagList;
    video.location = req.body.location;
    video.caption = req.body.caption;
    video.mentionPeople = req.body.mentionPeople;
    video.isOriginalAudio = req.body.isOriginalAudio;
    video.allowComment = req.body.allowComment;
    video.duration = req.body.duration;
    video.size = req.body.size;
    video.thumbnail = req.files.thumbnail ? config.baseURL + req.files.thumbnail[0].path : null;
    video.screenshot = req.files.screenshot ? config.baseURL + req.files.screenshot[0].path : null;
    video.song = !song ? null : song._id;
    video.isFake = true;
    video.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    await video.save();

    user.video += 1;
    await user.save();

    return res.status(200).json({ status: true, message: "Success!!", video });
  } catch (error) {
    if (req.files.video) deleteFile(req.files.video[0]);
    if (req.files.screenshot) deleteFile(req.files.screenshot[0]);
    if (req.files.thumbnail) deleteFile(req.files.thumbnail[0]);
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// update Fake video
exports.updateFakeVideo = async (req, res) => {
  try {
    let [video, song] = await Promise.all([Video.findById(req.query?.videoId), Song.findById(req.body?.songId)]);

    if (!video) {
      if (req.files.video) deleteFile(req.files.video[0]);
      if (req.files.screenshot) deleteFile(req.files.screenshot[0]);
      if (req.files.thumbnail) deleteFile(req.files.thumbnail[0]);
      return res.status(200).json({ status: false, message: "Video does not exist!" });
    }

    if (req.body.songId && !song) {
      if (req.files.video) deleteFile(req.files.video[0]);
      if (req.files.screenshot) deleteFile(req.files.screenshot[0]);
      if (req.files.thumbnail) deleteFile(req.files.thumbnail[0]);
      return res.status(200).json({ status: false, message: "Song does not exist!" });
    }

    const removeComa = req.body.hashtag?.replace(/,\s*$/, "") || "";
    const hashtagList = removeComa.split(",");

    for (const hashtag of hashtagList) {
      const h = hashtag.toLowerCase().trim();
      if (h !== "") {
        await Hashtag.findOneAndUpdate({ hashtag: h }, {}, { upsert: true, new: true });
      }
    }

    if ((req.files.video && req.body.fakeVideoType == 1) || (req.body.video && req.body.fakeVideoType == 0)) {
      if (video.fakeVideoType == 1) {
        const videoPath = video.video?.split("storage");
        if (videoPath?.[1] && fs.existsSync("storage" + videoPath[1])) {
          fs.unlinkSync("storage" + videoPath[1]);
        }
      }

      video.video = req.body.fakeVideoType == 0 ? req.body?.video : config.baseURL + req.files?.video[0].path;

      video.fakeVideoType = req.body?.fakeVideoType;
    }

    if (req.body.userId && video.userId.toString() !== req.body.userId) {
      await Promise.all([
        User.updateOne({ _id: req.body.userId }, { $inc: { video: 1 } }, { new: true }),
        User.updateOne({ _id: video.userId.toString() }, { $inc: { video: -1 } }).where({ video: { $gt: 0 } }),
      ]);
      video.userId = req.body.userId;
    }

    video.hashtag = hashtagList;
    video.location = req.body.location || video.location;
    video.caption = req.body.caption || video.caption;
    video.mentionPeople = req.body.mentionPeople || video.mentionPeople;
    video.isOriginalAudio = req.body.isOriginalAudio ?? video.isOriginalAudio;
    video.showVideo = req.body.showVideo ? parseInt(req.body.showVideo) : video.showVideo;
    video.allowComment = req.body.allowComment ?? video.allowComment;
    video.duration = req.body.duration || video.duration;
    video.size = req.body.size || video.size;
    video.thumbnail = req.files.thumbnail ? config.baseURL + req.files.thumbnail[0].path : video.thumbnail;
    video.screenshot = req.files.screenshot ? config.baseURL + req.files.screenshot[0].path : video.screenshot;
    video.song = song ? song._id : video.song;
    video.isFake = true;
    video.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    await video.save();

    video = await Video.findById(req.query.videoId).populate("userId");

    return res.status(200).json({ status: true, message: "Success!!", video });
  } catch (error) {
    if (req.files.video) deleteFile(req.files.video[0]);
    if (req.files.screenshot) deleteFile(req.files.screenshot[0]);
    if (req.files.thumbnail) deleteFile(req.files.thumbnail[0]);
    console.error(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Server Error",
    });
  }
};

// allow videoDetail [adminPanel]
exports.videoDetail = async (req, res) => {
  try {
    const [video, comment] = await Promise.all([Video.findById(req.query.videoId).populate("userId song"), Comment.countDocuments({ video: req.query.videoId })]);

    if (!video) return res.status(200).json({ status: false, message: "Video does not Exist!" });

    return res.status(200).json({
      status: true,
      message: "Success!!",
      video: { ...video._doc, comment },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
