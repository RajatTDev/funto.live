const Comment = require("./comment.model");
const User = require("../user/user.model");
const Post = require("../post/post.model");
const Video = require("../video/video.model");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc); // Extend dayjs with utc plugin
dayjs.extend(timezone);
const mongoose = require("mongoose");

//private key
const admin = require("../../util/privateKey");

//create comment
exports.store = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.comment || (!req.body.postId && !req.body.videoId)) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const comment = new Comment();
    let video, post, user;
    if (req.body.postId) {
      [user, post] = await Promise.all([User.findById(req.body.userId), Post.findById(req.body.postId).populate("userId")]);
      if (!user) {
        return res.status(200).json({ status: false, message: "User does not Exist!" });
      }

      if (!post) {
        return res.status(200).json({ status: false, message: "Post does not Exist!" });
      }
      comment.post = post._id;
    } else {
      [user, video] = await Promise.all([
        User.findById(req.body.userId),
        Video.findById(req.body.videoId).populate([
          {
            path: "userId",
            select: ["fcmToken", "name", "image", "isBlock", "notification", "isVIP"],
          },
          { path: "song" },
        ]),
      ]);

      if (!user) {
        return res.status(200).json({ status: false, message: "User does not Exist!" });
      }
      if (!video) {
        return res.status(200).json({ status: false, message: "Video does not Exist!" });
      }
      comment.video = video._id;
    }

    comment.userId = user._id;
    comment.comment = req.body.comment;
    await comment.save(); //@ todo

    res.status(200).json({ status: true, message: "success", comment });

    if (post) {
      post.comment += 1;
      await post.save();

      if (post.userId.fcmToken !== null && post.userId && post.userId._id.toString() !== user._id.toString() && !post.userId.isBlock && post.userId.notification.likeCommentShare) {
        const adminPromise = await admin;

        const payload = {
          token: post.userId.fcmToken,
          notification: {
            title: `${user.name} commented on your post.`,
          },
          data: {
            data: JSON.stringify([
              {
                _id: String(post._id),
                caption: String(post.caption),
                like: String(post.like),
                comment: String(post.comment),
                post: String(post.post),
                date: String(post.date),
                allowComment: String(post.allowComment),
                userId: post.userId ? String(post.userId._id) : "",
                name: post.userId ? String(post.userId.name) : "",
                userImage: post.userId ? String(post.userId.image) : "",
                isVIP: post.userId ? String(post.userId.isVIP) : "",
                isLike: String(true),
                time: post.date ? String(post.date.split(",")[0]) : "",
              },
            ]),
            type: "POST",
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
    } else {
      video.comment += 1;
      await video.save();

      if (video.userId.fcmToken !== null && video.userId && video.userId._id.toString() !== user._id.toString() && !video.userId.isBlock && video.userId.notification.likeCommentShare) {
        const adminPromise = await admin;

        const payload = {
          token: video.userId.fcmToken,
          notification: {
            title: `${user.name} commented on your Relite.`,
          },
          data: {
            data: JSON.stringify([
              {
                _id: String(video._id),
                hashtag: String(video.hashtag),
                mentionPeople: String(video.mentionPeople),
                isOriginalAudio: String(video.isOriginalAudio),
                like: String(video.like),
                comment: String(video.comment),
                allowComment: String(video.allowComment),
                showVideo: String(video.showVideo),
                isDelete: String(video.isDelete),
                userId: video.userId ? String(video.userId._id) : "",
                video: String(video.video),
                location: String(video.location),
                caption: String(video.caption),
                thumbnail: String(video.thumbnail),
                screenshot: String(video.screenshot),
                song: String(video.song),
                name: video.userId ? String(video.userId.name) : "",
                userImage: video.userId ? String(video.userId.image) : "",
                isVIP: video.userId ? String(video.userId.isVIP) : "false",
                isLike: String(true),
              },
            ]),
            type: "RELITE",
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

//get list of comment
exports.getComment = async (req, res) => {
  try {
    let now = dayjs();

    if (req.query.postId) {
      const post = await Post.findById(req.query.postId);
      if (!post) {
        return res.status(200).json({ status: false, message: "Post does not Exist!" });
      }
    } else {
      const video = await Video.findById(req.query.videoId);
      if (!video) {
        return res.status(200).json({ status: false, message: "V Shorts does not Exist!" });
      }
    }

    let query;
    if (req.query.postId) {
      query = { post: new mongoose.Types.ObjectId(req.query.postId) };
    } else {
      query = { video: new mongoose.Types.ObjectId(req.query.videoId) };
    }

    // let now = dayjs();

    if (req.query.type === "ADMIN") {
      const comment = await Comment.find({
        ...query,
      }).populate("userId");
      const comments = await comment.map((data) => ({
        _id: data._id,
        userId: data.userId ? data.userId._id : "",
        image: data.userId ? data.userId.image : "",
        name: data.userId ? data.userId.name : "",
        username: data.userId ? data.userId.username : "",
        isVIP: data.userId ? data.userId.isVIP : "",
        user: data.userId ? data.userId : null,
        comment: data.comment,
        time:
          now.diff(data.createdAt, "minute") <= 60 && now.diff(data.createdAt, "minute") >= 0
            ? now.diff(data.createdAt, "minute") + " minutes ago"
            : now.diff(data.createdAt, "hour") >= 24
            ? dayjs(data.createdAt).format("DD MMM, YYYY")
            : now.diff(data.createdAt, "hour") + " hour ago",
      }));

      return res.status(200).json({ status: true, message: "Success!!", data: comments });
    }

    const comment_ = await Comment.aggregate([
      {
        $match: { ...query },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userId",
        },
      },
      { $unwind: { path: "$userId", preserveNullAndEmptyArrays: false } },
      { $match: { "userId.isBlock": false } },
      { $sort: { createdAt: -1 } },
    ]);

    const comments = await comment_.map((data) => ({
      _id: data._id,
      userId: data.userId ? data.userId._id : "",
      image: data.userId ? data.userId.image : "",
      name: data.userId ? data.userId.name : "",
      username: data.userId ? data.userId.username : "",
      isVIP: data.userId ? data.userId.isVIP : "",
      comment: data.comment,
      time:
        now.diff(data.createdAt, "minute") <= 60 && now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? dayjs(data.createdAt).format("DD MMM, YYYY")
          : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    return res.status(200).json({ status: true, message: "Success!!", data: comments });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//destroy comment
exports.destroy = async (req, res) => {
  try {
    const comment = await Comment.findById(req.query.commentId);
    if (!comment) {
      return res.status(200).json({ status: false, message: "Comment does not Exist!" });
    }

    if (comment.post !== null) {
      await Post.updateOne({ _id: comment.post }, { $inc: { comment: -1 } }).where({ comment: { $gt: 0 } });
    } else {
      await Video.updateOne({ _id: comment.video }, { $inc: { comment: -1 } }).where({ comment: { $gt: 0 } });
    }

    await comment.deleteOne();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
