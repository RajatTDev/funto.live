const Hashtag = require("./hashtag.model");

// get hashtag list + search [for android]
exports.index = async (req, res) => {
  try {
    let query = {};

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    if (req.query.value) {
      query = {
        hashtag: { $regex: req.query.value, $options: "i" },
      };
    }

    const [hashtag , total] = await Promise.all([
      Hashtag.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "posts",
            let: { hashtag: "$hashtag" },
            as: "post",
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $gt: [{ $type: "$$hashtag" }, "null"] }, // Ensure hashtag is not null
                      {
                        $in: [
                          "$$hashtag",
                          { $ifNull: ["$hashtag", []] }, // Ensure array in $in
                        ],
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
            from: "videos",
            let: { hashtag: "$hashtag" },
            as: "video",
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $gt: [{ $type: "$$hashtag" }, "null"] }, // Ensure hashtag is not null
                      {
                        $in: [
                          "$$hashtag",
                          { $ifNull: ["$hashtag", []] }, // Ensure array in $in
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
        {
          $skip: (start - 1) * limit,
        },
        {
          $project: {
            hashtag: 1,
            createdAt: 1,
            postCount: { $size: "$post" },
            videoCount: { $size: "$video" },
          },
        },
        {
          $limit: limit,
        },
        { $sort: { createdAt: -1 } },
      ]),
      Hashtag.countDocuments({})
    ]);

    return res
      .status(200)
      .json({ status: true, message: "Success!!", hashtag , total });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// create hashtag
exports.store = async (req, res) => {
  try {
    if (!req.body.hashtag)
      return res
        .status(200)
        .json({ status: false, message: "Invalid Details!" });

    var removeComa = req.body.hashtag.replace(/,\s*$/, "");

    var hashtagList = removeComa.split(",");

    const hashtags = hashtagList.map((hashtag) => ({
      hashtag: hashtag.toLowerCase(),
    }));

    let hashtag = await Hashtag.insertMany(hashtags);
    hashtag = hashtag.map((data) => {
      return {
        ...data._doc,
        videoCount: 0,
        postCount: 0,
      };
    });
    return res
      .status(200)
      .json({ status: true, message: "Success!!", hashtag });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// update hashtag
exports.update = async (req, res) => {
  try {
    const hashtag = await Hashtag.findById(req.params.hashtagId);

    if (!hashtag)
      return res
        .status(200)
        .json({ status: false, message: "Hashtag does not Exist!" });

    hashtag.hashtag = req.body.hashtag.toLowerCase();

    await hashtag.save();
    let data = {
      ...hashtag._doc,
      videoCount: 0,
      postCount: 0,
    };
    return res
      .status(200)
      .json({ status: true, message: "Success!!", hashtag: data });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};

// delete hashtag
exports.destroy = async (req, res) => {
  try {
    const hashtag = await Hashtag.findById(req.params.hashtagId);

    if (!hashtag)
      return res
        .status(200)
        .json({ status: false, message: "Hashtag does not Exist!" });

    await hashtag.deleteOne();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};
