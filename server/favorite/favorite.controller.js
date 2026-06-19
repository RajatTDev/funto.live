const Favorite = require("./favorite.model");
const User = require("../user/user.model");
const Post = require("../post/post.model");
const Video = require("../video/video.model");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc); // Extend dayjs with utc plugin
dayjs.extend(timezone);

//private key
const admin = require("../../util/privateKey");

//like or unlike post and video
exports.likeUnlike = async (req, res, next) => {
  try {
    if (!req.query.userId || (!req.query.postId && !req.query.videoId))
      return res.status(200).json({
        status: false,
        message: "Invalid Details!",
      });

    let user, post, video, likeExist;

    if (req.query.postId) {
      [user, post, likeExist] = await Promise.all([
        User.findById(req.query.userId),
        Post.findById(req.query.postId).populate("userId"),
        Favorite.findOne({
          user: req.query.userId,
          post: req.query.postId,
        }),
      ]);

      if (!user) {
        return res.status(200).json({
          status: false,
          message: "User does not Exist!",
        });
      }

      if (!post)
        return res.status(200).json({
          status: false,
          message: "Post does not Exist!",
        });

      if (!likeExist) {
        await Favorite({
          user: user._id,
          post: post._id,
        }).save();

        res.status(200).json({
          status: true,
          message: "Post Like Successfully!!",
          isLiked: true,
        });

        post.like += 1;
        await post.save();

        if (post.userId.fcmToken !== null && post.userId && post.userId._id.toString() !== user._id.toString() && !post.userId.isBlock && post.userId.notification.likeCommentShare) {
          const adminPromise = await admin;

          const payload = {
            token: post.userId.fcmToken,
            notification: {
              title: `${user.name} liked your post.`,
            },
            data: {
              data: JSON.stringify([
                {
                  _id: String(post._id),
                  caption: String(post.caption || ""),
                  like: String(post.like || 0),
                  comment: String(post.comment || 0),
                  post: String(post.post || ""),
                  date: String(post.date || ""),
                  allowComment: String(post.allowComment || false),
                  userId: post.userId ? String(post.userId._id || "") : "",
                  name: post.userId ? String(post.userId.name || "") : "",
                  userImage: post.userId ? String(post.userId.image || "") : "",
                  isVIP: post.userId ? String(post.userId.isVIP || false) : "false",
                  isLike: String(true),
                  time: post.date ? post.date.split(",")[0] : "",
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

        return;
      } else {
        await Favorite.deleteOne({
          user: user._id,
          post: post._id,
        });

        res.status(200).json({
          status: true,
          message: "Post Dislike Successfully!!",
          isLiked: false,
        });

        post.like = post.like > 0 ? post.like - 1 : 0;
        await post.save();
      }
    } else {
      [user, video, likeExist] = await Promise.all([
        User.findById(req.query.userId),
        Video.findById(req.query.videoId).populate("userId song"),
        Favorite.findOne({
          user: req.query.userId,
          video: req.query.videoId,
        }),
      ]);

      if (!user) {
        return res.status(200).json({
          status: false,
          message: "User does not Exist!",
        });
      }

      if (!video) {
        return res.status(200).json({
          status: false,
          message: "Video does not Exist!",
        });
      }

      if (!likeExist) {
        await Favorite({
          user: user._id,
          video: video._id,
        }).save();

        res.status(200).json({
          status: true,
          message: "V Shorts Liked Successfully!!",
          isLiked: true,
        });

        video.like += 1;
        await video.save();

        if (video.userId.fcmToken !== null && video.userId && video.userId._id.toString() !== user._id.toString() && !video.userId.isBlock && video.userId.notification.likeCommentShare) {
          const adminPromise = await admin;

          const payload = {
            token: video.userId.fcmToken,
            notification: {
              title: `${user.name} liked your V Shorts.`,
            },
            data: {
              data: JSON.stringify([
                {
                  _id: video._id,
                  hashtag: video.hashtag,
                  mentionPeople: video.mentionPeople,
                  isOriginalAudio: video.isOriginalAudio,
                  like: video.like,
                  comment: video.comment,
                  allowComment: video.allowComment,
                  showVideo: video.showVideo,
                  isDelete: video.isDelete,
                  userId: video.userId ? video.userId._id : "",
                  video: video.video,
                  location: video.location,
                  caption: video.caption,
                  thumbnail: video.thumbnail,
                  screenshot: video.screenshot,
                  song: video.song,
                  name: video.userId ? video.userId.name : "",
                  userImage: video.userId ? video.userId.image : "",
                  isVIP: video.userId ? video.userId.isVIP : false,
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

        return;
      } else {
        await Favorite.deleteOne({
          user: user._id,
          video: video._id,
        });

        res.status(200).json({
          status: true,
          message: "V Shorts Unliked Successfully!!",
          isLiked: false,
        });

        video.like = video.like > 0 ? video.like - 1 : 0;
        await video.save();
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "server error" });
  }
};

//get list of likes
exports.getLikes = async (req, res) => {
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
      query = { post: req.query.postId };
    } else {
      query = { video: req.query.videoId };
    }

    const like = await Favorite.find({
      ...query,
    }).populate("user");

    if (req.query.type === "ADMIN") {
      const likes = await like.map((data) => ({
        _id: data._id,
        userId: data.user ? data.user._id : "",
        image: data.user ? data.user.image : "",
        name: data.user ? data.user.name : "",
        username: data.user ? data.user.username : "",
        comment: "",
        user: data.user ? data.user : null,
        time:
          now.diff(data.createdAt, "minute") <= 60 && now.diff(data.createdAt, "minute") >= 0
            ? now.diff(data.createdAt, "minute") + " minutes ago"
            : now.diff(data.createdAt, "hour") >= 24
            ? dayjs(data.createdAt).format("DD MMM, YYYY")
            : now.diff(data.createdAt, "hour") + " hour ago",
      }));

      return res.status(200).json({ status: true, message: "Success!!", data: likes });
    }

    const likes = await like.map((data) => ({
      _id: data._id,
      userId: data.user ? data.user._id : "",
      image: data.user ? data.user.image : "",
      name: data.user ? data.user.name : "",
      username: data.user ? data.user.username : "",
      comment: "",
      time:
        now.diff(data.createdAt, "minute") <= 60 && now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
          ? dayjs(data.createdAt).format("DD MMM, YYYY")
          : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    return res.status(200).json({ status: true, message: "Success", data: likes });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
