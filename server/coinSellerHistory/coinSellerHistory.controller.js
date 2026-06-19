const CoinSellerHistory = require("./coinSellerhistory.model");
const CoinSeller = require("../coinSeller/coinSeller.model");

const mongoose = require("mongoose");

//get history of particular coinSeller
exports.getCoinSellerHistory = async (req, res) => {
  try {
    if (!req.query.coinSellerId) {
      return res.status(200).json({ status: false, message: "coinSellerId must be requried." });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const coinSellerId = new mongoose.Types.ObjectId(req.query.coinSellerId);

    const [coinSeller, total, history] = await Promise.all([
      CoinSeller.findOne({ _id: coinSellerId, isDelete: false }),
      CoinSellerHistory.countDocuments({ coinSeller: coinSellerId }),
      CoinSellerHistory.find({ coinSeller: coinSellerId })
        .populate("user", "uniqueId")
        .skip((start - 1) * limit)
        .limit(limit)
        .sort({ createdAt: 1 }),
    ]);

    if (!coinSeller) {
      return res.status(200).json({
        status: false,
        message: "CoinSeller does not found.",
      });
    }

    if (!coinSeller.isActive) {
      return res.status(200).json({ status: false, message: "CoinSeller does not active by the admin." });
    }

    const totalCoin = coinSeller.coin;

    return res.status(200).json({
      status: true,
      message: "Success",
      totalCoin,
      total,
      history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server error" });
  }
};

//get history of the coinseller user (coin given to another user by him) (client)
exports.historyOfCoinSellerToUser = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const coinSellerId = new mongoose.Types.ObjectId(req.query.userId);

    const coinSeller = await CoinSeller.findOne({ user: coinSellerId, isDelete: false });
    if (!coinSeller) {
      return res.status(200).json({ status: false, message: "CoinSeller does not found." });
    }

    if (!coinSeller.isActive) {
      return res.status(200).json({ status: false, message: "coinSeller does not active by the admin." });
    }

    const history = await CoinSellerHistory.aggregate([
      {
        $match: {
          $and: [{ coinSeller: coinSeller._id }, { isIncome: false }],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 1,
          date: 1,
          coin: 1,
          name: "$user.name",
          username: "$user.username",
          email: "$user.email",
          image: "$user.image",
          gender: "$user.gender",
          country: "$user.country",
          uniqueId: "$user.uniqueId",
        },
      },
      { $sort: { _id: -1 } },
      { $skip: (start - 1) * limit },
      { $limit: limit },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success",
      history: history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server error" });
  }
};
