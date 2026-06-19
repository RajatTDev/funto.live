const PkGiftHistory = require("./pkGiftHistory.model");
const mongoose = require("mongoose");

exports.get = async (req, res) => {
  try {
    if (!req.query.liveStreamingId1 || !req.query.liveStreamingId2) {
      return res.status(200).json({ status: false, message: "Invalid Details" });
    }
    
    const [list1, list2] = await Promise.all([
      PkGiftHistory.aggregate([
        {
          $match: {
            liveStreamingId: new mongoose.Types.ObjectId(req.query.liveStreamingId1),
          },
        },
        { $group: { _id: "$userId", data: { $push: "$$ROOT" } } },
        {
          $lookup: {
            from: "users",
            localField: "data.userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
        {
          $project: {
            image: "$user.image",
            name: "$user.name",
            country: "$user.country",
            _id: "$user._id",
            count: { $size: "$data" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      PkGiftHistory.aggregate([
        {
          $match: {
            liveStreamingId: new mongoose.Types.ObjectId(req.query.liveStreamingId2),
          },
        },
        { $group: { _id: "$userId", data: { $push: "$$ROOT" } } },
        {
          $lookup: {
            from: "users",
            localField: "data.userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: false } },
        {
          $project: {
            image: "$user.image",
            name: "$user.name",
            country: "$user.country",
            _id: "$user._id",
            count: { $size: "$data" },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const data = {
      mainHostList: list1,
      geustHostList: list2,
    };

    return res.status(200).json({ status: true, message: "Success", data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
