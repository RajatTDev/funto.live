const Report = require("./report.model");
const User = require("../user/user.model");

//reported user [to user]
exports.reportedUser = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const skip = (start - 1) * limit;

    const result = await Report.aggregate([
      {
        $sort: { date: -1 },
      },
      {
        $lookup: {
          from: "users",
          let: { toUserIds: "$toUserId" },
          as: "toUserId",
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$$toUserIds", "$_id"] },
              },
            },
            {
              $project: {
                name: 1,
                username: 1,
                image: 1,
                country: 1,
                rCoin: 1,
                diamond: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: "$toUserId",
      },
      {
        $group: {
          _id: "$fromUserId",
          count: { $sum: 1 },
          report: { $push: "$$ROOT" },
        },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ]);

    const reportData = result[0].data || [];
    const total = result[0].metadata[0] ? result[0].metadata[0].total : 0;

    const populatedData = await Report.populate(reportData, [
      {
        path: "_id",
        model: "User",
        select: ["_id", "image", "name", "username", "country", "rCoin", "diamond"],
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success",
      total,
      page: start,
      limit,
      report: populatedData,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.store = async (req, res) => {
  try {
    if (!req.body.fromUserId || !req.body.toUserId || !req.body.description) return res.status(200).json({ status: false, message: "Invalid Details!!" });

    //from means live user id

    const [fromUser, toUser] = await Promise.all([User.findById(req.body.fromUserId), User.findById(req.body.toUserId)]);

    if (!fromUser) return res.status(200).json({ status: false, message: "User does not Exist!!" });

    if (!toUser) return res.status(200).json({ status: false, message: "User Does not Exist!" });

    const report = new Report();
    report.fromUserId = fromUser._id;
    report.toUserId = toUser._id;
    report.description = req.body.description;

    await report.save();

    return res.status(200).json({ status: true, message: "Success!!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
