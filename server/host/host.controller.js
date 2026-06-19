const Host = require("../user/user.model");
const Wallet = require("../wallet/wallet.model");
const mongoose = require("mongoose");
const LiveStreamingHistory = require("../liveStreamingHistory/liveStreamingHistory.model");
const moment = require("moment");

exports.getProfile = async (req, res) => {
  try {
    if (!req.query.hostId) {
      return res.status(200).json({ status: false, message: "Invalid details." });
    }

    const host = await Host.findOne({ isHost: true, _id: req.query.hostId }).populate("hostAgency", "name image _id uniqueId");
    if (!host) {
      return res.status(200).json({ status: false, message: "Host does not found." });
    }

    return res.status(200).json({ status: true, message: "Success", data: host });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.topCreators = async (req, res) => {
  try {
    const month = req.query.month;
    const hostId = req.query.hostId;
    if (!hostId) {
      return res.status(200).json({ status: false, message: "Host Id is required" });
    }

    if (!month) {
      return res.status(200).json({ status: false, message: "Month is required" });
    }

    const topCreators = await Wallet.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(hostId),
          isIncome: true,
          rCoin: { $ne: null },
          type: { $in: [0, 14] },
        },
      },
      {
        $addFields: {
          newDate: {
            $arrayElemAt: [{ $split: [{ $toString: "$createdAt" }, "T"] }, 0],
          },
          month: { $substr: [{ $toString: "$createdAt" }, 0, 7] },
        },
      },
      {
        $match: {
          month: { $eq: month },
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
        $unwind: {
          path: "$userId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: { "userId.isHost": true },
      },
      {
        $group: {
          _id: { date: "$newDate" },
          userId: { $first: "$userId._id" },
          uniqueId: { $first: "$userId.uniqueId" },
          totalRCoin: { $sum: "$rCoin" },
          diamond: { $sum: "$diamond" },
          image: { $first: "$userId.image" },
          name: { $first: "$userId.name" },
          date: { $first: "$newDate" },
        },
      },
      {
        $project: {
          _id: 0,
          userId: 1,
          date: 1,
          uniqueId: 1,
          totalRCoin: 1,
          image: 1,
          name: 1,
          diamond: 1,
        },
      },
      {
        $sort: { date: -1, totalRCoin: -1 },
      },
    ]);

    return res.status(200).json({ status: true, data: topCreators });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server Error" });
  }
};


exports.blockUnblock = async (req, res) => {
  try {
    const host = await Host.findById(req.query.hostId);
    if (!host) return res.status(200).json({ status: false, message: "host does not Exist!" });

    host.isBlock = !host.isBlock;
    await host.save();

    return res.status(200).json({ status: true, message: "Success!!", host });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.callHistory = async (req, res) => {
  try {
    const hostId = req.query.hostId;
    const month = req.query.month;
    if (!hostId) {
      return res.status(200).json({ status: false, message: "Host Id is required" });
    }

    const callHistory = await Wallet.aggregate([
      {
        $match: {
          $or: [{ userId: new mongoose.Types.ObjectId(hostId) }, { otherUserId: new mongoose.Types.ObjectId(hostId) }],
          type: 3,
        },
      },
      {
        $addFields: {
          month: { $substr: [{ $toString: "$createdAt" }, 0, 7] },
          callDurationMillis: {
            $subtract: [{ $toDate: "$callEndTime" }, { $toDate: "$callStartTime" }],
          },
        },
      },
      {
        $addFields: {
          callDurationSeconds: { $divide: ["$callDurationMillis", 1000] },
        },
      },
      {
        $addFields: {
          callDuration: {
            $dateToString: {
              format: "%H:%M:%S",
              date: {
                $toDate: { $multiply: ["$callDurationSeconds", 1000] },
              },
            },
          },
        },
      },
      { $match: { month: { $eq: month } } },
    ]);

    return res.status(200).json({ status: true, message: "Success", data: callHistory });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server Error" });
  }
};

exports.hostCallHistoryForAgency = async (req, res) => {
  try {
    const hostId = req.query.hostId;
    if (!hostId) {
      return res.status(200).json({ status: false, message: "Host Id is required" });
    }

    const startDate = moment(req.query.startDate, "YYYY-MM-DD").format("YYYY-MM-DD");
    const endDate = moment(req.query.endDate, "YYYY-MM-DD").format("YYYY-MM-DD");

    const callHistory = await Wallet.aggregate([
      {
        $match: {
          $or: [{ userId: new mongoose.Types.ObjectId(hostId) }, { otherUserId: new mongoose.Types.ObjectId(hostId) }],
          type: 3,
        },
      },
      {
        $addFields: {
          callDurationMillis: {
            $subtract: [{ $toDate: "$callEndTime" }, { $toDate: "$callStartTime" }],
          },
          newDate: {
            $dateToString: { format: "%Y-%m-%d", date: { $toDate: "$callStartTime" } },
          },
        },
      },
      {
        $match: {
          $and: [{ newDate: { $gte: startDate } }, { newDate: { $lte: endDate } }],
        },
      },
      {
        $addFields: {
          callDurationSeconds: { $divide: ["$callDurationMillis", 1000] },
        },
      },
      {
        $addFields: {
          callDuration: {
            $dateToString: {
              format: "%H:%M:%S",
              date: {
                $toDate: { $multiply: ["$callDurationSeconds", 1000] },
              },
            },
          },
        },
      },
    ]);

    return res.status(200).json({ status: true, message: "Success", data: callHistory });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server Error" });
  }
};

exports.hostCoinEarningForAgency = async (req, res) => {
  try {
    const hostId = req.query.hostId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    if (!hostId) {
      return res.status(200).json({ status: false, message: "Host Id is required" });
    }

    const topCreators = await Wallet.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(hostId),
          isIncome: true,
          rCoin: { $ne: null },
          type: 0,
        },
      },
      {
        $addFields: {
          newDate: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
        },
      },
      {
        $match: {
          newDate: { $gte: startDate, $lte: endDate },
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
        $unwind: {
          path: "$userId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: { date: "$newDate" },
          userId: { $first: "$userId._id" },
          uniqueId: { $first: "$userId.uniqueId" },
          totalRCoin: { $sum: "$rCoin" },
          image: { $first: "$userId.image" },
          name: { $first: "$userId.name" },
          date: { $first: "$newDate" },
        },
      },
      {
        $project: {
          _id: 0,
          userId: 1,
          date: 1,
          uniqueId: 1,
          totalRCoin: 1,
          image: 1,
          name: 1,
        },
      },
      {
        $sort: { date: -1, totalRCoin: -1 },
      },
    ]);

    return res.status(200).json({ status: true, data: topCreators });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server Error" });
  }
};

exports.hostLiveHistoryForAgency = async (req, res) => {
  try {
    const hostId = new mongoose.Types.ObjectId(req.query.hostId);
    if (!hostId) {
      return res.status(200).json({ status: false, message: "Host Id is required" });
    }

    const startDate = moment(req.query.startDate, "YYYY-MM-DD").format("YYYY-MM-DD");
    const endDate = moment(req.query.endDate, "YYYY-MM-DD").format("YYYY-MM-DD");

    const liveHistory = await LiveStreamingHistory.aggregate([
      {
        $match: {
          userId: hostId,
          duration: { $ne: "00:00:00" },
        },
      },
      {
        $addFields: {
          newDate: {
            $dateFromString: {
              dateString: { $arrayElemAt: [{ $split: ["$startTime", ","] }, 0] },
              format: "%m/%d/%Y",
            },
          },
        },
      },
      {
        $match: {
          newDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $project: {
          gifts: 1,
          rCoin: 1,
          startTime: 1,
          endTime: 1,
          duration: 1,
        },
      },
      { $sort: { gifts: -1, rcoin: -1 } },
    ]);

    return res.status(200).json({ status: true, message: "Success", data: liveHistory });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server Error" });
  }
};

exports.liveStreaming = async (req, res) => {
  try {
    const hostId = req.query.hostId;
    const month = req.query.month;
    if (!hostId) {
      return res.status(200).json({ status: false, message: "Host Id is required" });
    }

    const data = await LiveStreamingHistory.aggregate([
      {
        $match: { userId: new mongoose.Types.ObjectId(hostId), audio: false },
      },
      {
        $addFields: {
          month: { $substr: [{ $toString: "$createdAt" }, 0, 7] },
          newDate: {
            $arrayElemAt: [{ $split: [{ $toString: "$createdAt" }, "T"] }, 0],
          },
          durationMillis: {
            $subtract: [{ $toLong: { $toDate: "$endTime" } }, { $toLong: { $toDate: "$startTime" } }],
          },
        },
      },
      {
        $match: { month: { $eq: month } },
      },
      {
        $group: {
          _id: "$newDate",
          totalDurationMillis: { $sum: "$durationMillis" },
          diamond: { $sum: "$diamond" },
          gift: { $sum: "$gifts" },
        },
      },
      {
        $addFields: {
          totalDurationMinutes: {
            $floor: { $divide: ["$totalDurationMillis", 60000] },
          },
        },
      },
      {
        $project: {
          _id: 1,
          totalDurationMinutes: 1,
          diamond: 1,
          gift: 1,
        },
      },
    ]);

    return res.status(200).json({ status: true, message: "Success", data: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server Error" });
  }
};

exports.hostHistoryByDate = async (req, res) => {
  try {
    const hostId = req.query.hostId;
    const date = req.query.date || moment().format("YYYY-MM-DD HH:mm");

    if (!hostId) {
      return res.status(200).json({ status: false, message: "Host Id is required" });
    }

    const topCreators = await Wallet.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(hostId),
          isIncome: true,
          rCoin: { $ne: null },
          type: 0,
        },
      },
      {
        $addFields: {
          newDate: {
            $arrayElemAt: [{ $split: [{ $toString: "$createdAt" }, "T"] }, 0],
          },
          time: {
            $arrayElemAt: [{ $split: [{ $toString: "$date" }, ","] }, 1],
          },
        },
      },
      {
        $match: {
          newDate: { $eq: date },
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
        $unwind: {
          path: "$userId",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: { "userId.isHost": true },
      },
      {
        $sort: { date: -1, totalRCoin: -1 },
      },
      {
        $project: {
          _id: 0,
          date: "$newDate",
          rCoin: 1,
          time: 1,
        },
      },
    ]);

    return res.status(200).json({ status: true, data: topCreators });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server Error" });
  }
};


exports.index = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let matchQuery = {};
    let sortQuery = {createdAt: -1 };

    if (req.query.search != "ALL") {
      matchQuery = {
        $or: [
          { username: { $regex: req.query.search, $options: "i" } },
          { name: { $regex: req.query.search, $options: "i" } },
          { gender: { $regex: req.query.search, $options: "i" } },
          { country: { $regex: req.query.search, $options: "i" } },
          { searchUniqueId: { $regex: req.query.search, $options: "i" } },
        ],
      };
    }
    if(req.query.rcoin === "asc"){
      sortQuery = { rcoin : 1}
    }
    if(req.query.rcoin === "desc"){
      sortQuery = { rcoin : -1}
    }


    const user = await Host.aggregate([
      { $addFields: { searchUniqueId: { $toString: "$uniqueId" } } },
      {
        $match: {
          ...matchQuery,
          isFake: false,
          isBlock: false,
          isHost:true
        },
      },
      {
        $lookup: {
          from: "levels",
          localField: "level",
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
        $lookup: {
          from: "hostLevels",
          localField: "hostLevel",
          foreignField: "_id",
          as: "hostLevel",
        },
      },
      {
        $unwind: {
          path: "$hostLevel",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "agencies",
          localField: "hostAgency",
          foreignField: "_id",
          as: "agency",
        },
      },
      {
        $unwind: {
          path: "$agency",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "bds",
          localField: "hostBd",
          foreignField: "_id",
          as: "bd",
        },
      },
      {
        $unwind: {
          path: "$bd",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {  ...sortQuery  },
      },
      {
        $facet: {
          user: [
            { $skip: (start - 1) * limit }, // how many records you want to skip
            { $limit: limit },
          ],
          pageInfo: [
            { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
          ],
        },
      },
    ]);

    if (!user) {
      return res
        .status(200)
        .json({ status: false, message: "Data not found!" });
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      total: user[0].pageInfo.length > 0 ? user[0].pageInfo[0].totalRecord : 0,
      user: user[0].user,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, error: error.message || "Server Error" });
  }
};
