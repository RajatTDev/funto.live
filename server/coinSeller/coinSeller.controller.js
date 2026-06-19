const CoinSeller = require("./coinSeller.model");

//import model
const User = require("../user/user.model");
const CoinSellerHistory = require("../coinSellerHistory/coinSellerhistory.model");
const Wallet = require("../wallet/wallet.model");
const Block = require("../block/block.model");

//private key
const admin = require("../../util/privateKey");

//mongoose
const mongoose = require("mongoose");

//create coinSeller of the particular user
exports.create = async (req, res) => {
  try {
    if (!req.query.uniqueId || !req.query.coin || parseInt(req.query.coin) < 0) {
      return res.status(200).json({
        status: false,
        message: "Oops ! Invalid details.",
      });
    }

    let [user, coinSeller] = await Promise.all([User.findOne({ uniqueId: req.query.uniqueId }), CoinSeller.findOne({ uniqueId: req.query.uniqueId })]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (coinSeller) {
      return res.status(200).json({
        status: false,
        message: "coinSeller is already exists with that uniqueId.",
      });
    }

    coinSeller = await CoinSeller.create({
      user: user._id,
      uniqueId: user.uniqueId,
      coin: parseInt(req.query.coin),
      mobileNumber: req.query.mobileNumber,
      countryCode: req.query.countryCode,
    });

    const [data] = await Promise.all([
      CoinSeller.findById(coinSeller._id).populate("user", "name image uniqueId"),

      CoinSellerHistory.create({
        coinSeller: coinSeller?._id,
        isIncome: true,
        coin: parseInt(req.query.coin),
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }),

      User.updateOne({ _id: user._id }, { $set: { isCoinSeller: true } }),
    ]);

    return res.status(200).json({
      status: true,
      message: "Success",
      data: data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//coin given by admin to the particular coinSeller
exports.coinByadmin = async (req, res) => {
  try {
    if (!req.query.coinSellerId || !req.query.coin) {
      return res.status(200).json({ status: false, message: "oops ! Invalid details." });
    }

    const coinSellerId = new mongoose.Types.ObjectId(req.query.coinSellerId);
    const coin = Math.abs(req.query.coin);

    if (isNaN(coin) || coin <= 0) {
      return res.status(200).json({ status: false, message: "Coin value must be greater than 0." });
    }

    const [coinSeller, updatedCoinSeller] = await Promise.all([
      CoinSeller.findById(coinSellerId).populate("user", "name image uniqueId"),
      CoinSeller.findOneAndUpdate({ _id: coinSellerId }, { $inc: { coin: coin } }, { new: true }).populate("user", "name image uniqueId"),
      CoinSellerHistory.create({
        coinSeller: coinSellerId,
        coin: coin,
        isIncome: coin < 0 ? false : true,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }),
    ]);

    if (!coinSeller) {
      return res.status(200).json({
        status: false,
        message: "CoinSeller does not found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      data: updatedCoinSeller,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//coin less by admin to the particular coinSeller
exports.coinLessByAdmin = async (req, res) => {
  try {
    if (!req.query.coinSellerId || !req.query.coin) {
      return res.status(200).json({ status: false, message: "Oops! Invalid details." });
    }

    const coinSellerId = new mongoose.Types.ObjectId(req.query.coinSellerId);
    const coin = Math.abs(req.query.coin);
    if (isNaN(coin) || coin <= 0) {
      return res.status(200).json({ status: false, message: "Coin value must be greater than 0." });
    }

    const coinSeller = await CoinSeller.findById(coinSellerId).populate("user", "name image uniqueId");

    if (!coinSeller) {
      return res.status(200).json({
        status: false,
        message: "CoinSeller not found.",
      });
    }

    if (coinSeller.coin < coin) {
      return res.status(200).json({
        status: false,
        message: `Insufficient balance. Current balance: ${coinSeller.coin}`,
      });
    }

    const [updatedCoinSeller] = await Promise.all([
      CoinSeller.findOneAndUpdate({ _id: coinSellerId, coin: { $gte: coin } }, { $inc: { coin: -coin } }, { new: true }).populate("user", "name image uniqueId"),
      CoinSellerHistory.create({
        coinSeller: coinSellerId,
        coin: coin,
        isIncome: false,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }),
    ]);

    return res.status(200).json({
      status: true,
      message: "Coins deducted successfully.",
      data: updatedCoinSeller,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//coin seller active or not
exports.activeOrNot = async (req, res) => {
  try {
    if (!req.query.coinSellerId) {
      return res.status(200).json({
        status: false,
        message: "coinSellerId must be provided.",
      });
    }

    const coinSellerId = new mongoose.Types.ObjectId(req.query.coinSellerId);

    const coinSeller = await CoinSeller.findById(coinSellerId);
    if (!coinSeller) {
      return res.status(200).json({
        status: false,
        message: "CoinSeller not found.",
      });
    }

    const updatedCoinSeller = await CoinSeller.findOneAndUpdate({ _id: coinSellerId }, { isActive: !coinSeller.isActive }, { new: true }).populate("user", "name image uniqueId");

    await User.findOneAndUpdate({ _id: coinSeller.user }, { isCoinSeller: !coinSeller.isActive });

    return res.status(200).json({
      status: true,
      message: "Success",
      coinSeller: updatedCoinSeller,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//mobilenumber update
exports.editMobileNumber = async (req, res) => {
  try {
    if (!req.query.coinSellerId) {
      return res.status(200).json({
        status: false,
        message: "coinSellerId must be provided.",
      });
    }

    const coinSellerId = new mongoose.Types.ObjectId(req.query.coinSellerId);

    const coinSeller = await CoinSeller.findById(coinSellerId).populate("user", "name image uniqueId");
    if (!coinSeller) {
      return res.status(200).json({
        status: false,
        message: "CoinSeller not found.",
      });
    }

    coinSeller.mobileNumber = req.query.mobileNumber ? req.query.mobileNumber : coinSeller.mobileNumber;
    coinSeller.countryCode = req.query.countryCode ? req.query.countryCode : coinSeller.countryCode;
    await coinSeller.save();

    return res.status(200).json({
      status: true,
      message: "Success",
      coinSeller,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//get all coinSeller
exports.getAll = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;
    var pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                name: 1,
                image: 1,
                uniqueId: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$user" },
      {
        $addFields: {
          uniqueId: { $toString: "$uniqueId" },
          "user.uniqueId": { $toString: "$uniqueId" },
        },
      },
    ];
    if (req.query.search !== "ALL") {
      const searchRegex = new RegExp(req.query.search, "i");
      pipeline.push(
        {
          $addFields: {
            uniqueId: { $toString: "$uniqueId" },
          },
        },
        {
          $match: {
            // "user.name" : searchRegex
            $or: [{ "user.name": searchRegex }, { uniqueId: searchRegex }, { mobileNumber: searchRegex }],
          },
        }
      );
    }

    pipeline.push(
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
      }
    );

    const [total, coinSeller] = await Promise.all([
      CoinSeller.countDocuments(),
      CoinSeller.aggregate(pipeline),
      // CoinSeller.find()
      //   .populate("user", "name image uniqueId")
      //   .skip((start - 1) * limit)
      //   .limit(limit)
      //   .sort({ createdAt: -1 }),
    ]);

    return res.status(200).json({
      status: true,
      message: "Success",
      total: total,
      coinSeller: coinSeller.filter((item) => item.user !== null), //if user does not exist
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//coin purchased from coinSeller by user (client)
exports.coinByCoinSeller = async (req, res) => {
  if (!req.body.uniqueId || !req.body.coinSellerId || !req.body.coin || parseInt(req.body.coin) <= 0) {
    return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
  }

  const coinSellerId = new mongoose.Types.ObjectId(req.body.coinSellerId);
  const coin = Number(req.body.coin);

  const [coinSeller, user] = await Promise.all([
    CoinSeller.findOne({ _id: coinSellerId, isDelete: false }),
    User.findOne({ uniqueId: req.body.uniqueId }), //_id of user who purchased coin from coinSeller
  ]);

  if (!user) {
    return res.status(200).json({ status: false, message: "user does not found." });
  }

  if (!coinSeller) {
    return res.status(200).json({ status: false, message: "CoinSeller does not found." });
  }

  if (!coinSeller.isActive) {
    return res.status(200).json({ status: false, message: "coinSeller does not active." });
  }

  if (coinSeller.coin < coin) {
    return res.status(200).json({ status: false, message: "you don't have enough coin." });
  } else {
    const [updatedCoinSeller, updatedUser] = await Promise.all([
      CoinSeller.findOneAndUpdate(
        { _id: coinSellerId },
        {
          $inc: {
            spendCoin: coin,
            coin: -coin,
          },
        },
        { new: true }
      ),

      User.findOneAndUpdate(
        { _id: user._id },
        {
          $inc: {
            diamond: coin,
            purchasedCoin: coin,
          },
        },
        { new: true }
      ),

      CoinSellerHistory.create({
        coinSeller: coinSeller._id,
        user: user._id,
        coin: coin,
        isIncome: false,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }),

      Wallet.create({
        type: 12,
        userId: user._id,
        diamond: coin,
        date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
      }),
    ]);

    res.status(200).json({
      status: true,
      message: "Coin has been purchased by user from coinSeller.",
      data: updatedCoinSeller,
    });

    if (user && user.fcmToken && user.fcmToken !== null) {
      const adminPromise = await admin;

      const payload = {
        token: user.fcmToken,
        notification: {
          body: `You have received ${coin} diamonds through offline recharge.`,
          title: "Hoo Hoo !Got Coins",
        },
        data: {
          data: "",
          type: "aa",
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
};

//get isActive coinSeller (client)
exports.index = async (req, res) => {
  try {
    const userId = req.query.userId;

    if (!userId) {
      return res.status(200).json({
        status: false,
        message: "User ID is required",
      });
    }

    const [user, blockedUserIds] = await Promise.all([
      User.findById(userId).select("_id").lean(), //
      Block.distinct("toUserId", { userId: userId }),
    ]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    const coinSeller = await CoinSeller.aggregate([
      { $match: { isActive: true, isDelete: false } },
      {
        $lookup: {
          from: "users",
          localField: "user",
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
        $match: {
          "user._id": { $nin: blockedUserIds }, // Exclude blocked users
        },
      },
      {
        $project: {
          _id: 1,
          uniqueId: 1,
          coin: 1,
          spendCoin: 1,
          countryCode: 1,
          mobileNumber: 1,
          userId: "$user._id",
          name: "$user.name",
          image: "$user.image",
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success",
      coinSeller,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//get user who become coinSeller (client)
exports.getCoinSellerUser = async (req, res) => {
  try {
    const coinSeller = await CoinSeller.findOne({
      user: req.query.userId,
      isActive: true,
      isDelete: false,
    });

    return res.status(200).json({
      status: true,
      message: "Success",
      data: coinSeller,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};
