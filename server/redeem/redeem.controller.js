const Redeem = require("./redeem.model");
const User = require("../user/user.model");
const Wallet = require("../wallet/wallet.model");

//day.js
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

//mongoose
const mongoose = require("mongoose");

dayjs.extend(utc); // Extend dayjs with utc plugin
dayjs.extend(timezone);

//private key
const admin = require("../../util/privateKey");

//get redeem list [frontend]
exports.index = async (req, res) => {
  try {
    if (!req.query.type) return res.status(200).json({ status: false, message: "Type is Required!" });

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let redeem;
    let matchQuery = {};
    if (req.query.search != "ALL") {
      matchQuery = {
        $or: [
          { paymentGateway: { $regex: req.query.search, $options: "i" } },
          { description: { $regex: req.query.search, $options: "i" } },
          { "user.name": { $regex: req.query.search, $options: "i" } },
        ],
      };
    }

    if (req.query.type.trim() === "pending") {
      [redeem, total] = await Promise.all([
        Redeem.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
              pipeline: [
                {
                  $project: {
                    name: 1,
                    image: 1,
                    country: 1,
                    uniqueId: 1,
                  },
                },
              ],
            },
          },
          { $unwind: "$user" },
          {
            $match: {
              status: 0,
              ...matchQuery,
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $skip: (start - 1) * limit,
          },
          {
            $limit: limit,
          },
        ]),
        Redeem.countDocuments({ status: 0 }),
      ]);
      // redeem = await Redeem.find({ status: 0 }).populate("userId", "name image country").sort({ createdAt: -1 });
    }
    if (req.query.type.trim() === "solved") {
      [redeem, total] = await Promise.all([
        Redeem.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
              pipeline: [
                {
                  $project: {
                    name: 1,
                    image: 1,
                    country: 1,
                    uniqueId: 1,
                  },
                },
              ],
            },
          },
          { $unwind: "$user" },
          {
            $match: {
              status: 1,
              ...matchQuery,
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $skip: (start - 1) * limit,
          },
          {
            $limit: limit,
          },
        ]),
        Redeem.countDocuments({ status: 1 }),
      ]);
    }
    if (req.query.type.trim() === "decline") {
      [redeem, total] = await Promise.all([
        Redeem.aggregate([
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "user",
              pipeline: [
                {
                  $project: {
                    name: 1,
                    image: 1,
                    country: 1,
                    uniqueId: 1,
                  },
                },
              ],
            },
          },
          { $unwind: "$user" },
          {
            $match: {
              status: 2,
              ...matchQuery,
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $skip: (start - 1) * limit,
          },
          {
            $limit: limit,
          },
        ]),
        Redeem.countDocuments({ status: 2 }),
      ]);
    }

    if (!redeem) return res.status(200).json({ status: false, message: "No data Found!" });

    return res.status(200).json({ status: true, message: "Success!!", total, redeem });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get user redeem list
exports.userRedeem = async (req, res) => {
  try {
    let now = dayjs().tz("Asia/Kolkata");

    const [user, redeem] = await Promise.all([
      User.findById(req.query?.userId),
      Redeem.aggregate([
        {
          $match: {
            userId: { $eq: new mongoose.Types.ObjectId(req.query?.userId) },
          },
        },
        {
          $project: {
            _id: 1,
            status: {
              $switch: {
                branches: [
                  { case: { $eq: ["$status", 1] }, then: "Accepted" },
                  { case: { $eq: ["$status", 2] }, then: "Declined" },
                ],
                default: "Pending",
              },
            },
            // status: 1,
            userId: 1,
            description: 1,
            rCoin: 1,
            paymentGateway: 1,
            date: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ]),
    ]);

    if (!user) return res.status(200).json({ status: false, message: "User does not Exist!" });

    const redeemList = redeem.map((data) => ({
      ...data,
      time:
        now.diff(dayjs(data.createdAt), "minute") <= 60 && now.diff(dayjs(data.createdAt), "minute") >= 0
          ? now.diff(dayjs(data.createdAt), "minute") + " minutes ago"
          : now.diff(dayjs(data.createdAt), "hour") >= 24
            ? dayjs(dayjs(data.createdAt)).format("DD MMM, YYYY")
            : now.diff(dayjs(data.createdAt), "hour") + " hour ago",
    }));

    return res.status(200).json({
      status: redeemList.length > 0 ? true : false,
      message: redeemList.length > 0 ? "Success!" : "No Data Found",
      redeem: redeemList.length > 0 ? redeemList : [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//create redeem request by user
exports.store = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.paymentGateway || !req.body.description || !req.body.rCoin) {
      return res.status(200).json({ status: false, message: "Invalid Details." });
    }

    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "setting does not found!" });
    }

    let coin = parseInt(req.body.rCoin);
    if (coin > user.rCoin) {
      return res.status(200).json({ status: false, message: "Not Enough Coin for withdrawal." });
    }

    if (coin < settingJSON.minRcoinForCashOut) {
      return res.status(200).json({
        status: false,
        message: "The amount of rCoin is below the minimum required for withdrawal.",
      });
    }

    const redeem = new Redeem();

    redeem.userId = user._id;
    redeem.description = req.body.description.trim();
    redeem.paymentGateway = req.body.paymentGateway;
    redeem.rCoin = coin;
    redeem.amount = parseFloat(coin / settingJSON.rCoinForCashOut).toFixed(2);
    redeem.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });

    if (user.withdrawalRcoin > 0) {
      user.withdrawalRcoin += coin;
    }

    if (user.rCoin > 0) {
      user.rCoin -= coin;
    }

    await Promise.all([redeem.save(), user.save()]);

    return res.status(200).json({ status: true, message: "Success" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//accept or decline the redeem request
exports.update = async (req, res) => {
  try {
    const redeem = await Redeem.findById(req.params.redeemId);

    const user = await User.findById(redeem.userId);
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    let payload;

    if (req.query.type === "accept") {
      if (redeem.status == 1) {
        return res.status(200).json({
          status: false,
          message: "redeem request already accepted by the admin.",
        });
      }

      if (redeem.status == 2) {
        return res.status(200).json({
          status: false,
          message: "redeem request already declined by the admin.",
        });
      }

      redeem.status = 1;

      if (user.withdrawalRcoin > 0) {
        user.withdrawalRcoin -= redeem.rCoin;
      }

      const outgoing = new Wallet();
      outgoing.userId = user._id;
      outgoing.rCoin = redeem.rCoin;
      outgoing.type = 7;
      outgoing.isIncome = false;
      outgoing.date = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });

      await Promise.all([user.save(), outgoing.save(), redeem.save()]);

      payload = {
        token: user.fcmToken,
        notification: {
          title: "Your redeem request has been accepted!",
          body: "Congratulations! Your redeem request has been processed successfully.",
        },
      };
    } else {
      if (redeem.status == 1) {
        return res.status(200).json({
          status: false,
          message: "redeem request already accepted by the admin.",
        });
      }

      if (redeem.status == 2) {
        return res.status(200).json({
          status: false,
          message: "redeem request already declined by the admin.",
        });
      }

      redeem.status = 2;

      if (user.withdrawalRcoin > 0) {
        user.withdrawalRcoin -= redeem.rCoin;
      }

      if (user.rCoin > 0) {
        user.rCoin += redeem.rCoin;
      }

      await Promise.all([user.save(), redeem.save()]);

      payload = {
        to: user.fcmToken,
        notification: {
          title: "Your redeem request is declined!",
          body: "We regret to inform you that your redeem request has been declined. Please contact support for more details.",
        },
      };
    }

    res.status(200).json({ status: true, message: "Success", redeem });

    if (user && !user.isBlock && user.fcmToken !== null) {
      const adminPromise = await admin;

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
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
