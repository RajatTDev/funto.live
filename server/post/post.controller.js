const Post = require("./post.model");
const User = require("../user/user.model");
const Hashtag = require("../hashtag/hashtag.model");
const Follower = require("../follower/follower.model");
const Favorite = require("../favorite/favorite.model");
const Comment = require("../comment/comment.model");
const Block = require("../block/block.model");

const mongoose = require("mongoose");

const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc); // Extend dayjs with utc plugin
dayjs.extend(timezone);
const fs = require("fs");
const { deleteFile } = require("../../util/deleteFile");
const { compressImage } = require("../../util/compressImage");

//index
exports.index = async (req, res) => {
  try {
    if (req.query.userId) {
      const [user, post] = await Promise.all([User.findById(req.query.userId), Post.find({ userId: req.query.userId })]);
      if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });
      return res.status(200).json({ status: true, message: "Success!!", post });
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

    const post = await Post.aggregate([
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
            //     image: 1
            //
            //  }
            // }
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
        $facet: {
          post: [
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
      total: post[0].pageInfo.length > 0 ? post[0].pageInfo[0].totalRecord : 0,
      post: post[0].post,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//create post
exports.uploadPost = async (req, res) => {
  try {
    console.log("Uploading post", req.body);
    console.log("Uploading post image", req.file);

    if (!req.file || !req.body.userId) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const user = await User.findById(req.body.userId);

    if (!user) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    var removeComa = req.body.hashtag.replace(/,\s*$/, "");

    var hashtagList = removeComa.split(",");
    console.log("hashtagList", hashtagList);

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

    // compress image
    compressImage(req.file);

    const post = new Post();
    post.userId = user._id;
    post.post = req.file.path;

    post.hashtag = req.body.hashtag && hashtagList;
    post.location = req.body.location && req.body.location;
    post.caption = req.body.caption && req.body.caption;
    post.mentionPeople = req.body.mentionPeople && req.body.mentionPeople;
    post.showPost = req.body.showPost && parseInt(req.body.showPost);
    post.allowComment = req.body.allowComment && req.body.allowComment;
    post.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    await post.save();

    user.post += 1;
    await user.save();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    deleteFile(req.file);
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get popular and latest post list
exports.getPopularLatestPosts = async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(200).json({ status: false, message: "Invalid user ID" });
    }

    let now = dayjs().tz("Asia/Kolkata");

    const start = req.query.start ? parseInt(req.query.start) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    let likeCommentSort = {},
      popularLatestSort = {};
    if (req.query.type === "popular") {
      likeCommentSort = {
        like: -1,
        comment: -1,
      };
      popularLatestSort = { isVIP: -1 };
    } else {
      popularLatestSort = { sortingDate: -1 };
      likeCommentSort = { sortingDate: -1 };
    }

    const [user, blockedUserIds] = await Promise.all([
      User.findById(req.query.userId).select("_id").lean(), //
      Block.distinct("toUserId", { userId: req.query.userId }), // Fetch only toUserId values directly
    ]);

    const [FakePost, posts] = await Promise.all([
      Post.aggregate([
        {
          $match: {
            isFake: true,
            isDelete: false,
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
            from: "followers",
            let: { authorId: "$user._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$fromUserId", new mongoose.Types.ObjectId(userId)] }, { $eq: ["$toUserId", "$$authorId"] }],
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
              postId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$post", "$$postId"] },
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
            from: "comments",
            as: "comment",
            let: {
              postId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$post", "$$postId"],
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
        {
          $project: {
            userId: "$user._id",
            name: "$user.name",
            location: 1,
            caption: 1,
            date: 1,
            createdAt: 1,
            post: 1,
            allowComment: 1,
            userImage: "$user.image",
            avatarFrameImage: "$user.avatarFrameImage",
            countryFlagImage: "$user.countryFlagImage",
            like: 1,
            comment: { $size: "$comment" },
            isFake: 1,
            isVIP: "$user.isVIP",
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
          },
        },
        {
          $sort: { date: -1 },
        },
      ]),
      Post.aggregate([
        {
          $match: {
            showPost: 0,
            isFake: false,
            isDelete: false,
            userId: { $nin: blockedUserIds },
          },
        },
        {
          $addFields: { sortingDate: { $toDate: "$date" } },
        },
        {
          $sort: { ...likeCommentSort },
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
          $lookup: {
            from: "followers",
            let: { authorId: "$user._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$fromUserId", new mongoose.Types.ObjectId(userId)] }, { $eq: ["$toUserId", "$$authorId"] }],
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
              postId: "$_id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$post", "$$postId"] },
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
          $project: {
            userId: "$user._id",
            name: "$user.name",
            location: 1,
            caption: 1,
            date: {
              $cond: {
                if: { $ifNull: ["$createdAt", false] }, // Check if 'createdAt' exists and is not null
                then: "$createdAt", // If 'createdAt' exists, use 'createdAt'
                else: "$date", // Otherwise, use 'date'
              },
            },
            // date: 1,
            post: 1,
            allowComment: 1,
            userImage: "$user.image",
            avatarFrameImage: "$user.avatarFrameImage",
            countryFlagImage: "$user.countryFlagImage",
            like: 1,
            comment: 1,
            isVIP: "$user.isVIP",
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
          },
        },
      ]).sort(popularLatestSort),
    ]);

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    const fakePost = FakePost.map((data) => ({
      ...data,
      time:
        now.diff(data.createdAt, "minute") <= 60 && now.diff(data.createdAt, "minute") >= 0
          ? now.diff(data.createdAt, "minute") + " minutes ago"
          : now.diff(data.createdAt, "hour") >= 24
            ? dayjs(data.createdAt).format("DD MMM, YYYY")
            : now.diff(data.createdAt, "hour") + " hour ago",
    }));

    const post = posts.map((data) => ({
      ...data,
      time:
        now.diff(dayjs(data.date), "minute") <= 60 && now.diff(dayjs(data.date), "minute") >= 0
          ? now.diff(dayjs(data.date), "minute") + " minutes ago"
          : now.diff(dayjs(data.date), "hour") >= 24
            ? dayjs(data.date).format("DD MMM, YYYY")
            : now.diff(dayjs(data.date), "hour") + " hour ago",
    }));

    if (settingJSON?.isFake) {
      const combinedPosts = [...post, ...fakePost].sort(() => 0.5 - Math.random());
      //.sort((a, b) => new Date(b.date) - new Date(a.date));

      const startIndex = start * limit;
      const endIndex = startIndex + limit;

      const paginatedPosts = combinedPosts.slice(startIndex, endIndex);

      return res.status(200).json({
        status: true,
        message: "Success!",
        post: paginatedPosts,
      });
    } else {
      const realPosts = post.sort(() => 0.5 - Math.random());
      //.sort((a, b) => new Date(b.date) - new Date(a.date));

      const startIndex = start * limit;
      const endIndex = startIndex + limit;

      const paginatedPosts = realPosts.slice(startIndex, endIndex);

      return res.status(200).json({
        status: true,
        message: "Success!",
        post: paginatedPosts,
      });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get following post list
exports.getFollowingPosts = async (req, res) => {
  try {
    let now = dayjs().tz("Asia/Kolkata");

    const [user, posts] = await Promise.all([
      User.findById(req.query.userId),
      Follower.aggregate([
        {
          $match: { fromUserId: new mongoose.Types.ObjectId(req.query.userId) },
        },
        {
          $lookup: {
            from: "posts",
            let: { toUserId: "$toUserId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$$toUserId", "$userId"] }, { $eq: ["$isDelete", false] }],
                  },
                },
              },
            ],
            as: "post",
          },
        },
        {
          $unwind: {
            path: "$post",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: "users",
            let: { userId: "$post.userId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$$userId", "$_id"] }, { $eq: ["$isBlock", false] }],
                  },
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
          $lookup: {
            from: "favorites",
            let: {
              postId: "$post._id",
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$post", "$$postId"] },
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
            from: "followers",
            let: { postUserId: "$user._id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ["$fromUserId", new mongoose.Types.ObjectId(req.query.userId)] }, { $eq: ["$toUserId", "$$postUserId"] }],
                  },
                },
              },
            ],
            as: "followInfo",
          },
        },
        {
          $project: {
            _id: "$post._id",
            userId: "$user._id",
            name: "$user.name",
            location: "$post.location",
            caption: "$post.caption",
            date: "$post.createdAt",
            allowComment: "$post.allowComment",
            post: "$post.post",
            userImage: "$user.image",
            avatarFrameImage: "$user.avatarFrameImage",
            countryFlagImage: "$user.countryFlagImage",
            like: "$post.like",
            comment: "$post.comment",
            isVIP: "$user.isVIP",
            isLike: {
              $cond: [
                {
                  $eq: [new mongoose.Types.ObjectId(req.query.userId), "$favorite.user"],
                },
                true,
                false,
              ],
            },
            isFollow: {
              $cond: {
                if: { $gt: [{ $size: "$followInfo" }, 0] },
                then: true,
                else: false,
              },
            },
          },
        },
        {
          $sort: { date: -1 },
        },
        { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
        { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
      ]),
    ]);

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    const post = posts.map((data) => ({
      ...data,
      time:
        now.diff(dayjs(data.date, "minute")) <= 60 && now.diff(dayjs(data.date, "minute")) >= 0
          ? now.diff(dayjs(data.date, "minute")) + " minutes ago"
          : now.diff(dayjs(data.date, "hour")) >= 24
            ? dayjs(data.date).format("DD MMM, YYYY")
            : now.diff(dayjs(data.date, "hour")) + " hour ago",
    }));

    return res.status(200).json({
      status: post.length > 0 ? true : false,
      message: post.length > 0 ? "Success!" : "No Data Found!",
      post: post.length > 0 ? post : [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get users post list
exports.getUserPosts = async (req, res) => {
  try {
    let now = dayjs().tz("Asia/Kolkata");

    const [user, posts] = await Promise.all([
      User.findById(req.query.userId),
      Post.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(req.query.userId),
            isDelete: false,
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
            from: "favorites",
            let: {
              postId: "$_id",
              userId: new mongoose.Types.ObjectId(req.query.userId),
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$post", "$$postId"] },
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
          $project: {
            userId: "$user._id",
            name: "$user.name",
            avatarFrameImage: "$user.avatarFrameImage",
            countryFlagImage: "$user.countryFlagImage",
            location: 1,
            caption: 1,
            // date: 1,
            date: "$createdAt",
            post: 1,
            allowComment: 1,
            userImage: "$user.image",
            like: 1,
            comment: 1,
            isVIP: "$user.isVIP",
            isLike: {
              $cond: [
                {
                  $eq: [new mongoose.Types.ObjectId(req.query.userId), "$favorite.user"],
                },
                true,
                false,
              ],
            },
          },
        },
        {
          $addFields: { sortingDate: { $toDate: "$date" } },
        },
        {
          $sort: { sortingDate: -1 },
        },
        { $skip: req.query.start ? parseInt(req.query.start) : 0 }, // how many records you want to skip
        { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
      ]),
    ]);

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    const post = posts.map((data) => ({
      ...data,
      time:
        now.diff(dayjs(data.date, "minute")) <= 60 && now.diff(dayjs(data.date, "minute")) >= 0
          ? now.diff(dayjs(data.date, "minute")) + " minutes ago"
          : now.diff(dayjs(data.date, "hour")) >= 24
            ? dayjs(data.date).format("DD MMM, YYYY")
            : now.diff(dayjs(data.date, "hour")) + " hour ago",
    }));

    return res.status(200).json({
      status: post.length > 0 ? true : false,
      message: post.length > 0 ? "Success!" : "No Data Found!",
      post: post.length > 0 ? post : [],
    });
  } catch (error) {
    console.log(error);
    return res.status(200).json({ status: true, error: error.message || "Server Error" });
  }
};

//delete post
exports.destroy = async (req, res) => {
  try {
    const post = await Post.findById(req.query.postId);
    if (!post) return res.status(200).json({ status: false, message: "Post does not Exist!" });

    if (fs.existsSync(post.post)) {
      fs.unlinkSync(post.post);
    }

    await Comment.deleteMany({ post: post._id });
    await Favorite.deleteMany({ post: post._id });

    post.comment = 0;
    post.like = 0;
    post.isDelete = true;
    await post.save();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//allow disallow comment on V Shorts [frontend]
exports.allowDisallowComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate("userId");
    if (!post) return res.status(200).json({ status: false, message: "Post does not Exist!" });

    post.allowComment = !post.allowComment;
    await post.save();

    return res.status(200).json({ status: true, message: "Success!!", post });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get perticular post by post id[web]
exports.getPostById = async (req, res) => {
  try {
    if (!req.query.postId) return res.status(200).json({ status: false, message: "No data found!" });
    const post = await Post.findById(req.query.postId).populate("userId");
    return res.json({ status: true, message: "success", post: post });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ status: false, error: err.message || "Server Error" });
  }
};

// create  fake post
exports.uploadFakePost = async (req, res) => {
  try {
    console.log("Uploading post", req.body);
    console.log("Uploading post image", req.file);
    if (!req.file || !req.body.userId) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const user = await User.findById(req.body.userId);

    if (!user) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    // var removeComa = req.body.hashtag.replace(/,\s*$/, "");

    // var hashtagList = removeComa.split(",");

    // console.log("hashtagList", hashtagList);

    // if (hashtagList.length > 0) {
    //   hashtagList.map((hashtag) => {
    //     const h = hashtag.toLowerCase();
    //     if (h !== "" || h !== " ") {
    //       Hashtag.findOneAndUpdate(
    //         { hashtag: h },
    //         {},
    //         { upsert: true },
    //         function (err) {
    //           // console.log(err)
    //         }
    //       );
    //     }
    //   });
    // }

    // compress image
    compressImage(req.file);

    const post = new Post();
    post.userId = user._id;

    // if (req.body.fakePostType == 0) {
    //   post.post = req.body.post ? req.body.post : null;
    //   post.fakePostType = req.body.fakePostType;
    // }

    // if (req.body.fakePostType == 1) {
    //   post.post = req.file
    //     ? req.file.path
    //     : null;
    //     post.fakePostType = req.body.fakePostType;
    // }
    post.post = req.file ? req.file.path : null;
    // post.hashtag = req.body.hashtag && hashtagList;
    post.location = req.body.location && req.body.location;
    post.caption = req.body.caption && req.body.caption;
    post.mentionPeople = req.body.mentionPeople && req.body.mentionPeople;
    post.showPost = req.body.showPost && parseInt(req.body.showPost);
    post.allowComment = req.body.allowComment && req.body.allowComment;
    post.isFake = true;
    post.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    await post.save();

    user.post += 1;
    await user.save();

    return res.status(200).json({ status: true, message: "Success!!", post });
  } catch (error) {
    deleteFile(req.file);
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// update  fake post
exports.updateFakePost = async (req, res) => {
  try {
    const post = await Post.findById(req.query.postId);
    if (!post) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "post not found!" });
    }
    if (req.file) {
      compressImage(req.file);
    }
    let postUser;
    post.post = req.file ? req.file.path : post.post;
    postUser = post.userId.toString();
    post.userId = req.body.userId ? req.body.userId : post.userId;
    post.hashtag = req.body.hashtag ? req.body.hashtag : post.hashtag;
    post.location = req.body.location ? req.body.location : post.location;
    post.caption = req.body.caption ? req.body.caption : post.caption;
    post.mentionPeople = req.body.mentionPeople ? req.body.mentionPeople : [];
    post.showPost = req.body.showPost ? parseInt(req.body.showPost) : post.showPost;
    post.allowComment = req.body.allowComment ? req.body.allowComment : post.allowComment;
    post.isFake = true;
    post.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    await post.save();

    res.status(200).json({ status: true, message: "Success!!", post });

    if (post.userId.toString() !== postUser) {
      await Promise.all([
        User.updateOne(
          { _id: post.userId },
          {
            post: { $inc: 1 },
          }
        ),
        User.updateOne(
          { _id: postUser },
          {
            post: { $inc: -1 },
          }
        ),
      ]);
    }
  } catch (error) {
    deleteFile(req.file);
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
