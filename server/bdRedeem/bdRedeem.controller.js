const BdRedeem = require("./bdRedeem.model");
const Bd = require("../bd/bd.model");
const PaymentMethod = require("../paymentMethod/paymentMethod.model");
const Wallet = require("../wallet/wallet.model");
const Admin = require("../admin/admin.model");
const mongoose = require("mongoose");

const generateTransactionId = () =>
  `TXN-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;

//redeem request by BD
exports.store = async (req, res) => {
  try {
    const { bdId, coin, paymentGateway, paymentDetails } = req.body;

    if (!bdId || !coin || !paymentGateway || !paymentDetails) {
      return res.status(200).json({
        status: false,
        message: "BD ID, coin and payment method are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid BD ID.",
      });
    }

    const withdrawCoin = Number(coin);

    if (!Number.isInteger(withdrawCoin) || withdrawCoin <= 0) {
      return res.status(200).json({
        status: false,
        message: "Coin must be a valid positive number.",
      });
    }

    const bd = await Bd.findById(bdId).select(
      "_id name rCoin totalWithdrawn netCoin isActive"
    );

    if (!bd) {
      return res.status(200).json({
        status: false,
        message: "BD not found.",
      });
    }

    if (!bd.isActive) {
      return res.status(200).json({
        status: false,
        message: "Your account is inactive.",
      });
    }

    if (!settingJSON) {
      return res.status(500).json({
        status: false,
        message: "System settings not found.",
      });
    }

    if (withdrawCoin < settingJSON.minRcoinForCashOutBd) {
      return res.status(200).json({
        status: false,
        message: `Minimum withdrawal coins required: ${settingJSON.minRcoinForCashOutBd}`,
      });
    }

    if (bd.netCoin < withdrawCoin) {
      return res.status(200).json({
        status: false,
        message: `Insufficient balance. Available coins: ${bd.netCoin}`,
      });
    }

    const [alreadyPending] = await Promise.all([
      BdRedeem.exists({
        bd: bd._id,
        status: "pending",
      })
    ])

    if (alreadyPending) {
      return res.status(200).json({
        status: false,
        message:
          "Previous withdrawal request is still pending. Try after it is processed.",
      });
    }

    const amount = Number(
      (withdrawCoin / settingJSON.rCoinForCashOut).toFixed(2)
    );

    let parsedPaymentDetails = paymentDetails;

    if (typeof paymentDetails === "string") {
      try {
        parsedPaymentDetails = JSON.parse(paymentDetails);
      } catch (error) {
        return res.status(200).json({
          status: false,
          message: "Invalid paymentDetails JSON format."
        });
      }
    }

    if (
      typeof parsedPaymentDetails !== "object" ||
      parsedPaymentDetails === null ||
      Array.isArray(parsedPaymentDetails)
    ) {
      return res.status(200).json({
        status: false,
        message: "paymentDetails must be a valid object."
      });
    }

    bd.netCoin -= withdrawCoin;

    const [bdRedeem] = await Promise.all([
      BdRedeem.create({
        bd: bd._id,
        rCoin: withdrawCoin,
        amount,
        paymentGateway,
        paymentDetails: parsedPaymentDetails,
      }),
      bd.save()
    ])



    return res.status(200).json({
      status: true,
      message: "Withdrawal request created successfully.",
      data: bdRedeem,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

//accept or decline the redeem request of BD by admin
exports.update = async (req, res) => {
  try {
    const { bdRedeemId, bdId, type, reason } = req.body;

    if (!bdRedeemId || !type) {
      return res.status(200).json({
        status: false,
        message: "BD Redeem ID and type are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bdRedeemId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid BD Redeem ID.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid BD ID.",
      });
    }

    const action = type.toLowerCase().trim();

    if (!["accept", "decline"].includes(action)) {
      return res.status(200).json({
        status: false,
        message: "Type must be 'accept' or 'decline'.",
      });
    }

    const [bdRedeem, bd] = await Promise.all([
      BdRedeem.findById(bdRedeemId),
      Bd.findById(bdId).select("_id user netCoin totalWithdrawn")
    ])

    if (!bdRedeem) {
      return res.status(200).json({
        status: false,
        message: "Withdrawal request not found.",
      });
    }

    if (bdRedeem.status !== "pending") {
      return res.status(200).json({
        status: false,
        message: `Withdrawal request already ${bdRedeem.status}.`,
      });
    }

    if (!bd) {
      return res.status(200).json({
        status: false,
        message: "BD not found.",
      });
    }

    if (action === "accept") {
      bdRedeem.status = "approved";
      bdRedeem.transactionId = generateTransactionId();
      bdRedeem.processedAt = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

      bd.totalWithdrawn += bdRedeem.rCoin;

      await Promise.all([
        bd.save(),
        bdRedeem.save(),
        Wallet.create({
          bdId: bd._id,
          rCoin: bdRedeem.rCoin,
          isIncome: false,
          type: 22,
          date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        })]);

      return res.status(200).json({
        status: true,
        message: "Withdrawal request accepted successfully.",
        data: bdRedeem,
      });
    }

    if (action === "decline") {
      if (!reason) {
        return res.status(200).json({
          status: false,
          message: "Reason is required for declining.",
        });
      }

      bdRedeem.status = "rejected";
      bdRedeem.reason = reason.trim();
      bdRedeem.processedAt = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

      bd.netCoin += bdRedeem.rCoin;

      await Promise.all([bd.save(), bdRedeem.save()]);

      return res.status(200).json({
        status: true,
        message: "Withdrawal request declined.",
        data: bdRedeem,
      });
    }
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

//get BD redeem requests for admin (all BDs)
exports.getBdRedeem = async (req, res) => {
  try {
    const { type = "pending", search = "", start = 1, limit = 20 } = req.query;

    const validTypes = ["pending", "approved", "rejected"];
    const status = type.trim();

    if (status !== "all" && !validTypes.includes(status)) {
      return res.status(200).json({
        status: false,
        message: "Type must be 'pending', 'approved', 'rejected', or 'all'.",
      });
    }

    const page = Math.max(parseInt(start) || 1, 1);
    const perPage = Math.max(parseInt(limit) || 20, 1);

    const trimmedSearch = search?.trim();

    const pipeline = [];

    if (status !== "all") {
      pipeline.push({ $match: { status } });
    }

    pipeline.push({
      $lookup: {
        from: "bds",
        localField: "bd",
        foreignField: "_id",
        as: "bd",
        pipeline: [
          {
            $project: {
              _id: 1,
              name: 1,
              image: 1,
              bdCode: 1,
              uniqueId: 1,
            },
          },
        ],
      },
    });

    pipeline.push({ $unwind: "$bd" });

    if (trimmedSearch && trimmedSearch !== "all") {
      const searchMatch = {
        $or: [
          { "bd.name": { $regex: trimmedSearch, $options: "i" } },
          { "bd.bdCode": { $regex: trimmedSearch, $options: "i" } },
        ],
      };

      if (!isNaN(trimmedSearch)) {
        searchMatch.$or.push({ "bd.uniqueId": Number(trimmedSearch) });
      }

      pipeline.push({ $match: searchMatch });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [
            { $skip: (page - 1) * perPage },
            { $limit: perPage },
            {
              $project: {
                _id: 1,
                coin: 1,
                amount: 1,
                status: 1,
                createdAt: 1,
                bd: 1,
                reason: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      }
    );

    const [result] = await BdRedeem.aggregate(pipeline);

    return res.status(200).json({
      status: true,
      message: "BD withdrawal requests fetched successfully.",
      total: result.total[0]?.count || 0,
      data: result.data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

//get redeem requests of a particular BD
exports.getBdWise = async (req, res) => {
  try {
    const { bdId, type = "all", start = 1, limit = 20 } = req.query;

    if (!bdId) {
      return res.status(200).json({
        status: false,
        message: "BD ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid BD ID.",
      });
    }

    const bd = await Bd.findById(bdId).select("_id name");

    if (!bd) {
      return res.status(200).json({
        status: false,
        message: "BD not found.",
      });
    }

    const page = Math.max(parseInt(start) || 1, 1);
    const perPage = Math.max(parseInt(limit) || 20, 1);

    const matchQuery = { bd: bd._id };

    if (type !== "all") {
      const validTypes = ["pending", "approved", "rejected"];

      if (!validTypes.includes(type)) {
        return res.status(200).json({
          status: false,
          message: "Invalid type.",
        });
      }

      matchQuery.status = type;
    }

    const pipeline = [
      { $match: matchQuery },

      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: (page - 1) * perPage },
            { $limit: perPage },
          ],

          stats: [
            {
              $group: {
                _id: null,
                totalRequests: { $sum: 1 },
              },
            },
          ],
        },
      },
    ];

    const result = await BdRedeem.aggregate(pipeline);

    const data = result[0].data;
    const stats = result[0].stats[0] || {
      totalRequests: 0,
    };

    return res.status(200).json({
      status: true,
      message: "BD withdrawal requests fetched successfully.",
      total: stats.totalRequests,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

//Withdraw Request Page — 3 cards + paginated history
exports.withdrawPage = async (req, res) => {
  try {
    const { bdId, start = 1, limit = 10 } = req.query;

    if (!bdId) {
      return res.status(200).json({ status: false, message: "BD ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId)) {
      return res.status(200).json({ status: false, message: "Invalid BD ID." });
    }

    const bdObjectId = new mongoose.Types.ObjectId(bdId);
    const page = Math.max(parseInt(start), 1);
    const perPage = Math.max(parseInt(limit), 1);
    const skip = (page - 1) * perPage;

    const bd = await Bd.findById(bdObjectId)
      .select("rCoin totalWithdrawn netCoin")
      .lean();

    if (!bd) {
      return res.status(200).json({
        status: false,
        message: "BD not found."
      });
    }

    const minWithdrawLimit = settingJSON?.minRcoinForCashOutBd || 0;

    const result = await BdRedeem.aggregate([
      { $match: { bd: bdObjectId } },

      {
        $facet: {
          history: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: perPage },

            {
              $lookup: {
                from: "paymentmethods",
                localField: "paymentMethod",
                foreignField: "_id",
                as: "paymentMethod"
              }
            },

            {
              $unwind: {
                path: "$paymentMethod",
                preserveNullAndEmptyArrays: true
              }
            },

            {
              $project: {
                _id: 1,
                amount: "$rCoin",
                paymentMethod: { $ifNull: ["$paymentMethod.name", "Bank Transfer"] },
                requestDate: "$createdAt",
                status: 1,
                statusCode: "$status",
                processedDate: "$processedAt",
                transactionId: 1,
                createdAt: 1
              }
            }
          ],

          total: [
            { $count: "count" }
          ],

          pending: [
            { $match: { status: "pending" } },
            {
              $group: {
                _id: null,
                total: { $sum: "$rCoin" }
              }
            }
          ]
        }
      }
    ]);

    const history = result[0].history;
    const total = result[0].total[0]?.count || 0;
    const pendingRequest = result[0].pending[0]?.total || 0;

    const withdrawableBalance = bd.netCoin;

    return res.status(200).json({
      status: true,
      message: "Withdraw page data fetched successfully.",
      data: {
        cards: {
          withdrawableBalance,
          minWithdrawLimit,
          pendingRequest,
          balanceExceedsMinimum: withdrawableBalance >= minWithdrawLimit
        },
        history,
        total
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};

//get BD's wallet transaction history (for admin and BD)
exports.getWalletTransactionOfBD = async (req, res) => {
  try {
    const { bdId } = req.query;

    if (!bdId) {
      return res.status(200).json({
        status: false,
        message: "BD ID is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid BD ID.",
      });
    }

    const bd = await Bd.findById(bdId).select("_id user netCoin totalWithdrawn").lean();

    if (!bd) {
      return res.status(200).json({
        status: false,
        message: "BD not found.",
      });
    }

    const page = parseInt(req.query.start) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const query = { bdId: bd._id };

    if (req.query.type && req.query.type?.trim()?.toLowerCase() !== "all") {
      const validTypes = [21, 22, 23, 24];

      if (!validTypes.includes(parseInt(req.query.type))) {
        return res.status(200).json({
          status: false,
          message: "Invalid type..."
        })
      }
      query.type = parseInt(req.query.type);
    }

    const [total, history] = await Promise.all([
      Wallet.countDocuments(query),
      Wallet.find(query)
        .select("_id bdId otherAgencyId type rCoin isIncome date createdAt")
        .populate("otherAgencyId", "name image agencyCode")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return res.status(200).json({
      status: true,
      message: "BD's wallet transaction history fetched successfully.",
      total,
      data: history,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};