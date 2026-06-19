const Bd = require("./bd.model");
const User = require("../user/user.model");
const Agency = require("../agency/agency.model");
const Region = require("../region/region.model");
const BdRedeem = require("../bdRedeem/bdRedeem.model");
const Wallet = require("../wallet/wallet.model");

const { deleteFile } = require("../../util/deleteFile");
const { baseURL } = require("../../config");
const config = require("../../config");
const mongoose = require("mongoose");

//private key
const admin = require("../../util/privateKey");

//generate unique BD code
const generateBdCode = async () => {
  const prefix = "BD";
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
  const random = Math.floor(1000 + Math.random() * 9000);

  const bdCode = `${prefix}-${date}-${random}`;

  const exists = await Bd.exists({ bdCode });

  if (exists) {
    return generateBdCode();
  }

  return bdCode;
};

//create BD
exports.store = async (req, res) => {
  try {
    const { name, uniqueId, mobile, regions } = req.body;

    if (!name || !uniqueId || !mobile || !regions) {
      throw new Error("Name, uniqueId, mobile and regions are required.");
    }

    if (!req.file) {
      throw new Error("Image is required.");
    }

    const cleanName = name.trim();
    const parsedUniqueId = parseInt(uniqueId);
    const cleanMobile = mobile.trim();

    if (cleanName.length < 2) {
      throw new Error("Name must be at least 2 characters.");
    }

    if (isNaN(parsedUniqueId)) {
      throw new Error("uniqueId must be a valid number.");
    }

    if (cleanMobile.length < 7 || cleanMobile.length > 15) {
      throw new Error("Mobile number must be between 7 and 15 digits.");
    }

    // Validate regions
    let validRegions = [];

    if (Array.isArray(regions) && regions.length) {
      const uniqueRegions = [...new Set(regions)];

      const invalidIds = uniqueRegions.filter((id) => !mongoose.Types.ObjectId.isValid(id));

      if (invalidIds.length) {
        throw new Error("One or more region IDs are invalid.");
      }

      const regionDocs = await Region.find({
        _id: { $in: uniqueRegions },
        isActive: true,
      }).select("_id");

      if (regionDocs.length !== uniqueRegions.length) {
        throw new Error("One or more regions not found or inactive.");
      }

      validRegions = uniqueRegions;
    }

    const user = await User.findOne({ uniqueId }).select("_id uniqueId isHost isAgency isBd isBlock isFake fcmToken");

    if (!user) throw new Error("User not found with this uniqueId.");
    if (user.isHost) throw new Error("User is already a host.");
    if (user.isAgency) throw new Error("User is already an agency.");
    if (user.isBd) throw new Error("User is already a BD.");
    if (user.isBlock) throw new Error("User is blocked.");
    if (user.isFake) throw new Error("User is fake.");

    // Generate BD code
    const bdCode = await generateBdCode();

    // Create BD
    const bd = await Bd.create({
      name: cleanName,
      image: baseURL + req.file.path,
      bdCode,
      uniqueId: user.uniqueId,
      user: user._id,
      mobile: cleanMobile,
      regions: validRegions,
      bdCommission: settingJSON?.bdCommission,
    });

    bd.loginString = `${config?.BD_PATH || ""}?bdid=${bd._id}`;
    await bd.save();

    try {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            isBd: true,
            bd: bd._id,
            bdLoginString: bd.loginString,
          },
        },
      );
    } catch (err) {
      await Bd.deleteOne({ _id: bd._id });
      throw new Error("Failed to update user role.");
    }

    // const data = await Bd.findById(bd._id)
    //   .select(
    //     "name image bdCode uniqueId mobile regions rCoin totalWithdrawn isActive loginString createdAt"
    //   )
    //   .populate("user", "name username image uniqueId")
    //   .populate("regions", "name");

    res.status(200).json({
      status: true,
      message: "BD created successfully.",
      //   data,
    });

    if (user && user.fcmToken && user.fcmToken !== null) {
      const adminPromise = await admin;

      const payload = {
        token: user.fcmToken,
        notification: {
          body: "Congratulations! You are now become a BD.",
          title: "BD Created",
        },
        data: {
          data: `${bd.bdCode}`,
          type: "BD Created",
        },
      };

      adminPromise
        .messaging()
        .send(payload)
        .then((response) => {
          console.log("Successfully sent with response: ", response);
        })
        .catch((error) => {
          console.log("Error sending message: ", error);
        });
    }
  } catch (error) {
    if (req.file) deleteFile(req.file);

    return res.status(200).json({
      status: false,
      message: error.message,
    });
  }
};

//update BD
exports.update = async (req, res) => {
  try {
    const { bdId } = req.query;

    if (!bdId) {
      throw new Error("BD ID is required.");
    }

    if (!mongoose.Types.ObjectId.isValid(bdId)) {
      throw new Error("Invalid BD ID.");
    }

    const bd = await Bd.findById(bdId);

    if (!bd) {
      throw new Error("BD not found.");
    }

    const update = {};

    // Name
    if (req.body.name) {
      const name = req.body.name.trim();

      if (name.length < 2) {
        throw new Error("Name must be at least 2 characters.");
      }

      const existingName = await Bd.exists({
        _id: { $ne: bd._id },
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });

      if (existingName) {
        throw new Error("BD already exists with this name.");
      }

      update.name = name;
    }

    // Mobile
    if (req.body.mobile) {
      const mobile = req.body.mobile.trim();

      if (mobile.length < 7 || mobile.length > 15) {
        throw new Error("Mobile number must be between 7 and 15 digits.");
      }

      update.mobile = mobile;
    }

    // Image
    if (req.file) {
      if (bd.image) {
        deleteFile(bd.image);
      }

      update.image = baseURL + req.file.path;
    }

    // Regions
    if (Array.isArray(req.body.regions)) {
      const regions = [...new Set(req.body.regions)];

      if (regions.length) {
        const invalidIds = regions.filter((id) => !mongoose.Types.ObjectId.isValid(id));

        if (invalidIds.length) {
          throw new Error("One or more region IDs are invalid.");
        }

        const regionDocs = await Region.find({
          _id: { $in: regions },
          isActive: true,
        }).select("_id");

        if (regionDocs.length !== regions.length) {
          throw new Error("One or more regions not found or inactive.");
        }
      }

      update.regions = regions;
    }

    if (req.body.bdCommission) {
      if (req.body.bdCommission < 0 || req.body.bdCommission > 100) {
        throw new Error("BD commission must be between 0 and 100.");
      }
      if (req.body.bdCommission < settingJSON?.bdCommission) {
        throw new Error("BD commission cannot be less than default BD commission.");
      }
      update.bdCommission = req.body.bdCommission;
    }

    await Bd.updateOne({ _id: bd._id }, { $set: update });

    // const data = await Bd.findById(bd._id)
    //   .select(
    //     "name image bdCode uniqueId mobile regions rCoin totalWithdrawn pendingWithdrawableRequestCoin isActive createdAt"
    //   )
    //   .populate("user", "name username image uniqueId")
    //   .populate("regions", "name");

    return res.status(200).json({
      status: true,
      message: "BD updated successfully.",
      //   data,
    });
  } catch (error) {
    if (req.file) deleteFile(req.file);

    return res.status(200).json({
      status: false,
      message: error.message,
    });
  }
};

//active or not BD
exports.activeOrNot = async (req, res) => {
  try {
    if (!req.query.bdId) {
      return res.status(200).json({ status: false, message: "BD ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.query.bdId)) {
      return res.status(200).json({ status: false, message: "Invalid BD ID." });
    }

    const bd = await Bd.findById(req.query.bdId).select("_id user isActive");
    if (!bd) {
      return res.status(200).json({ status: false, message: "BD not found." });
    }

    const newActiveStatus = !bd.isActive;

    await Promise.all([
      Bd.updateOne({ _id: bd._id }, { $set: { isActive: newActiveStatus } }),
      User.updateOne(
        { _id: bd.user },
        {
          $set: {
            isBd: newActiveStatus,
            ...(newActiveStatus ? { bd: bd._id } : { bd: null }),
          },
        },
      ),
    ]);

    const message = newActiveStatus ? "BD activated successfully." : "BD deactivated successfully.";

    return res.status(200).json({ status: true, message /*data: updatedBd*/ });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server error" });
  }
};

//get all BDs
exports.index = async (req, res) => {
  try {
    const start = parseInt(req.query.start) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search?.trim();

    let matchConditions = [];

    if (search && search.toLowerCase() !== "all") {
      const isNumber = !isNaN(search);

      matchConditions.push({ name: { $regex: search, $options: "i" } });

      if (isNumber) {
        matchConditions.push({ uniqueId: Number(search) });
        matchConditions.push({ bdCode: Number(search) });
      }

      matchConditions.push({ "userData.name": { $regex: search, $options: "i" } }, { "regionsData.name": { $regex: search, $options: "i" } });
    }

    const pipeline = [
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData",
          pipeline: [{ $project: { _id: 1, name: 1, uniqueId: 1, image: 1 } }],
        },
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },

      // Lookup regions with only necessary fields
      {
        $lookup: {
          from: "regions",
          localField: "regions",
          foreignField: "_id",
          as: "regionsData",
          pipeline: [{ $project: { _id: 1, name: 1 } }],
        },
      },

      ...(matchConditions.length ? [{ $match: { $or: matchConditions } }] : []),

      { $sort: { createdAt: -1 } },

      {
        $facet: {
          data: [
            { $skip: (start - 1) * limit },
            { $limit: limit },
            {
              $project: {
                name: 1,
                image: 1,
                bdCode: 1,
                uniqueId: 1,
                mobile: 1,
                rCoin: 1,
                totalWithdrawn: 1,
                netCoin: 1,
                isActive: 1,
                createdAt: 1,
                bdCommission: 1,
                user: {
                  _id: "$userData._id",
                  name: "$userData.name",
                  uniqueId: "$userData.uniqueId",
                  image: "$userData.image",
                },
                regions: {
                  $map: {
                    input: "$regionsData",
                    as: "r",
                    in: { _id: "$$r._id", name: "$$r.name" },
                  },
                },
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const result = await Bd.aggregate(pipeline);

    return res.status(200).json({
      status: true,
      message: "BD list fetched successfully.",
      total: result[0].total[0]?.count || 0,
      data: result[0].data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal server error",
    });
  }
};

//get BD profile
exports.getBdProfile = async (req, res) => {
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

    const [bd, totalAgencies] = await Promise.all([
      Bd.findById(bdId)
        .select("name image mobile uniqueId bdCode bdCommission regions rCoin totalWithdrawn netCoin isActive createdAt user")
        .populate("regions", "name")
        .populate({
          path: "user",
          select: "name image uniqueId bankDetails",
        })
        .lean(),
      Agency.countDocuments({ bd: bdId }),
    ]);

    if (!bd) {
      return res.status(200).json({
        status: false,
        message: "BD not found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "BD profile fetched successfully.",
      data: {
        ...bd,
        totalAgencies,
      },
    });
  } catch (error) {
    console.error("getBdProfile error:", error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

//get agencies under a BD
exports.getBdAgencies = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    const search = req.query.search || "";

    if (!req.query.bdId) {
      return res.status(200).json({ status: false, message: "BD ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.query.bdId)) {
      return res.status(200).json({ status: false, message: "Invalid BD ID." });
    }

    const bdId = new mongoose.Types.ObjectId(req.query.bdId);

    const bdExists = await Bd.exists({ _id: bdId });
    if (!bdExists) {
      return res.status(200).json({ status: false, message: "BD not found." });
    }

    const pipeline = [
      {
        $match: { bd: bdId },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData",
          pipeline: [{ $project: { _id: 1, name: 1, username: 1, country: 1, uniqueId: 1, image: 1 } }],
        },
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { name: { $regex: search, $options: "i" } },
                  { uniqueId: { $regex: search, $options: "i" } },
                  { agencyCode: { $regex: search, $options: "i" } },
                  { "userData.name": { $regex: search, $options: "i" } },
                  { "userData.username": { $regex: search, $options: "i" } },
                  { "userData.uniqueId": { $regex: search, $options: "i" } },
                  { "userData.country": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $facet: {
          total: [{ $count: "count" }],
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: (start - 1) * limit },
            { $limit: limit },
            {
              $project: {
                name: 1,
                image: 1,
                agencyCode: 1,
                uniqueId: 1,
                mobile: 1,
                rCoin: 1,
                isActive: 1,
                createdAt: 1,
                user: {
                  _id: "$userData._id",
                  name: "$userData.name",
                  uniqueId: "$userData.uniqueId",
                  image: "$userData.image",
                },
              },
            },
          ],
        },
      },
    ];

    const result = await Agency.aggregate(pipeline);

    return res.status(200).json({
      status: true,
      message: "BD agencies fetched successfully.",
      total: result[0].total[0]?.count || 0,
      data: result[0].data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server error" });
  }
};

//get users dropdown for BD creation (users who are not already host/agency/bd)
exports.getUsersDropdown = async (req, res) => {
  try {
    let matchQuery = {
      isFake: false,
      isBlock: false,
      isHost: false,
      isAgency: false,
      isBd: false,
    };

    if (req.query?.search?.toLowerCase() != "all") {
      const search = req.query?.search || "";
      const searchNum = parseInt(search);
      matchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
        { country: { $regex: search, $options: "i" } },
        ...(isNaN(searchNum) ? [] : [{ uniqueId: searchNum }]),
      ];
    }

    const users = await User.find(matchQuery).select("_id name image uniqueId country").sort({ createdAt: -1 }).limit(50);

    return res.status(200).json({ status: true, message: "Users fetched successfully.", data: users });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server error" });
  }
};

// get BDs dropdown for Agency creation
exports.getBDDropdown = async (req, res) => {
  try {
    const search = req.query?.search || "";
    const searchNum = parseInt(search);

    let matchStage = { isActive: true };

    let searchMatch = [];

    if (search.toLowerCase() !== "all" && search !== "") {
      searchMatch = [
        { name: { $regex: search, $options: "i" } },
        { "userData.name": { $regex: search, $options: "i" } },
        { "userData.country": { $regex: search, $options: "i" } },
        { "regionsData.name": { $regex: search, $options: "i" } },
      ];

      if (!isNaN(searchNum)) {
        searchMatch.push({ uniqueId: searchNum }, { bdCode: searchNum });
      }
    }

    const users = await Bd.aggregate([
      {
        $match: matchStage,
      },

      // join User collection
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },
      { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },

      // join Region collection
      {
        $lookup: {
          from: "regions",
          localField: "regions",
          foreignField: "_id",
          as: "regionsData",
        },
      },

      ...(searchMatch.length
        ? [
            {
              $match: {
                $or: searchMatch,
              },
            },
          ]
        : []),

      {
        $project: {
          name: 1,
          image: 1,
          uniqueId: 1,
          bdCode: 1,
          "userData.name": 1,
          "userData.country": 1,
          regionsData: { name: 1 },
        },
      },

      { $sort: { createdAt: -1 } },
      { $limit: 50 },
    ]);

    return res.status(200).json({
      status: true,
      message: "BDs fetched successfully.",
      data: users,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal server error",
    });
  }
};

//admin add or deduct coins from BD
exports.addDeductCoin = async (req, res) => {
  try {
    const { bdId, coin, type } = req.body;

    if (!bdId || !coin || !type) {
      return res.status(200).json({
        status: false,
        message: "BD ID, coin and type are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid BD ID.",
      });
    }

    const amount = Number(coin);

    if (!Number.isInteger(amount) || amount === 0) {
      return res.status(200).json({
        status: false,
        message: "Coin must be a valid non-zero number.",
      });
    }

    if (!["add", "deduct"].includes(type)) {
      return res.status(200).json({
        status: false,
        message: "Type must be 'add' or 'deduct'.",
      });
    }

    const bd = await Bd.findById(bdId).select("_id user name rCoin netCoin totalWithdrawn");

    if (!bd) {
      return res.status(200).json({
        status: false,
        message: "BD not found.",
      });
    }

    const coinValue = Math.abs(amount);

    if (type === "add") {
      bd.rCoin += coinValue;
      bd.netCoin += coinValue;

      const [user, bdRedeem, wallet] = await Promise.all([
        User.findById(bd.user).select("fcmToken"),
        bd.save(),
        Wallet.create({
          bdId: bd._id,
          rCoin: coinValue,
          isIncome: true,
          type: 23,
          date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        }),
      ]);

      res.status(200).json({
        status: true,
        message: `${coinValue} coins added successfully.`,
      });

      if (user && user.fcmToken && user.fcmToken !== null) {
        const adminPromise = await admin;

        const payload = {
          token: user.fcmToken,
          notification: {
            body: `Congratulations! Admin added ${coinValue} coins into your account.`,
            title: "Coins Added",
          },
          data: {
            data: `${bd.bdCode}`,
            type: "Coins Added",
          },
        };

        adminPromise
          .messaging()
          .send(payload)
          .then((response) => {
            console.log("Successfully sent with response: ", response);
          })
          .catch((error) => {
            console.log("Error sending message: ", error);
          });
      }
    }

    if (type === "deduct") {
      if (coinValue > bd.netCoin) {
        return res.status(200).json({
          status: false,
          message: `Cannot deduct ${coinValue} coins. Available balance is ${bd.netCoin}.`,
        });
      }

      bd.netCoin -= coinValue;

      const [user, bdRedeem, wallet] = await Promise.all([
        User.findById(bd.user).select("fcmToken"),
        bd.save(),
        Wallet.create({
          bdId: bd._id,
          rCoin: coinValue,
          isIncome: false,
          type: 24,
          date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        }),
      ]);

      res.status(200).json({
        status: true,
        message: `${coinValue} coins deducted successfully.`,
      });

      if (user && user.fcmToken && user.fcmToken !== null) {
        const adminPromise = await admin;

        const payload = {
          token: user.fcmToken,
          notification: {
            body: `Admin deducted ${coinValue} coins from your account.`,
            title: "Coins deducted",
          },
          data: {
            data: `${bd.bdCode}`,
            type: "Coins deducted",
          },
        };

        adminPromise
          .messaging()
          .send(payload)
          .then((response) => {
            console.log("Successfully sent with response: ", response);
          })
          .catch((error) => {
            console.log("Error sending message: ", error);
          });
      }
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

//helper: get start/end of a month (IST timezone)
const getMonthRange = (monthsAgo = 0) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { start, end };
};

//BD dashboard cards
exports.dashboardCards = async (req, res) => {
  try {
    const { bdId, startDate, endDate } = req.query;

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

    const bd = await Bd.findById(bdId).select("_id");

    if (!bd) {
      return res.status(200).json({
        status: false,
        message: "BD not found.",
      });
    }

    let start, end;

    if (startDate && endDate && startDate !== "all" && endDate !== "all") {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const thisMonth = getMonthRange(0);
      start = thisMonth.start;
      end = thisMonth.end;
    }

    const agencyIds = await Agency.find({ bd: bd._id }).distinct("_id");

    const [totalAgencies, totalHosts, walletStats] = await Promise.all([
      Agency.countDocuments({ bd: bd._id, createdAt: { $gte: start, $lte: end } }),
      User.countDocuments({
        hostAgency: { $in: agencyIds },
        isHost: true,
        createdAt: { $gte: start, $lte: end },
      }),
      Wallet.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            $or: [
              {
                type: { $in: [0, 13] },
                isIncome: true,
                parentAgencyId: { $in: agencyIds },
              },
              {
                type: 17,
                parentBdId: bd._id,
              },
              {
                type: 21,
                bdId: bd._id,
              },
            ],
          },
        },
        {
          $group: {
            _id: null,
            hostEarnings: {
              $sum: {
                $cond: [{ $in: ["$type", [0, 13]] }, "$rCoin", 0],
              },
            },
            agencyCommission: {
              $sum: {
                $cond: [{ $eq: ["$type", 17] }, "$rCoin", 0],
              },
            },
            bdCommission: {
              $sum: {
                $cond: [{ $eq: ["$type", 21] }, "$rCoin", 0],
              },
            },
          },
        },
      ]),
    ]);

    const stats = walletStats[0] || {
      hostEarnings: 0,
      agencyCommission: 0,
      bdCommission: 0,
    };

    return res.status(200).json({
      status: true,
      message: "Dashboard cards fetched successfully.",
      data: {
        totalAgencies,
        totalHosts,
        hostEarnings: stats.hostEarnings,
        agencyCommission: stats.agencyCommission,
        bdCommission: stats.bdCommission,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      status: false,
      error: error.message || "Internal server error",
    });
  }
};

//BD revenue trend
exports.revenueTrend = async (req, res) => {
  try {
    const { bdId, startDate, endDate } = req.query;

    if (!bdId) {
      return res.status(200).json({ status: false, message: "BD ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId)) {
      return res.status(200).json({ status: false, message: "Invalid BD ID." });
    }

    let start, end;

    if (startDate && endDate && startDate !== "all" && endDate !== "all") {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const thisMonth = getMonthRange(0);
      start = thisMonth.start;
      end = thisMonth.end;
    }

    const bdObjectId = new mongoose.Types.ObjectId(bdId);

    const bdExists = await Bd.exists({ _id: bdObjectId });
    if (!bdExists) {
      return res.status(200).json({ status: false, message: "BD not found." });
    }

    const agencyIds = await Agency.distinct("_id", { bd: bdObjectId });

    const walletStats = await Wallet.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          $or: [
            { type: { $in: [0, 13] }, isIncome: true, parentAgencyId: { $in: agencyIds } },
            { type: 17, parentBdId: bdObjectId },
            { type: 21, bdId: bdObjectId },
          ],
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            month: { $month: "$createdAt" },
          },
          hostEarnings: {
            $sum: { $cond: [{ $in: ["$type", [0, 13]] }, "$rCoin", 0] },
          },
          agencyCommission: {
            $sum: { $cond: [{ $eq: ["$type", 17] }, "$rCoin", 0] },
          },
          bdCommission: {
            $sum: { $cond: [{ $eq: ["$type", 21] }, "$rCoin", 0] },
          },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Revenue trend fetched successfully.",
      walletStats,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal server error",
    });
  }
};

//Get Bd's Agencies
exports.myAgencies = async (req, res) => {
  try {
    const { bdId, search, country, status } = req.query;

    const page = parseInt(req.query.start) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    if (!bdId) {
      return res.status(200).json({ status: false, message: "BD ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId)) {
      return res.status(200).json({ status: false, message: "Invalid BD ID." });
    }

    const bdObjectId = new mongoose.Types.ObjectId(bdId);

    const bdExists = await Bd.exists({ _id: bdObjectId });

    if (!bdExists) {
      return res.status(200).json({ status: false, message: "BD not found." });
    }

    let startDate, endDate;

    if (req.query.startDate && req.query.endDate && req.query.startDate !== "all" && req.query.endDate !== "all") {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const thisMonth = getMonthRange(0);
      startDate = thisMonth.start;
      endDate = thisMonth.end;
    }

    let match = { bd: bdObjectId };

    if (status === "active") match.isActive = true;
    if (status === "inactive") match.isActive = false;

    const pipeline = [
      { $match: match },

      // get agency owner country
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          pipeline: [{ $project: { country: 1 } }],
          as: "userInfo",
        },
      },

      { $unwind: { path: "$userInfo", preserveNullAndEmptyArrays: true } },

      ...(search
        ? [
            {
              $match: {
                $or: [
                  { name: { $regex: search, $options: "i" } },
                  { "userInfo.name": { $regex: search, $options: "i" } },
                  { "userInfo.country": { $regex: search, $options: "i" } },
                  ...(Number.isFinite(Number(search)) ? [{ agencyCode: Number(search) }, { uniqueId: Number(search) }] : []),
                ],
              },
            },
          ]
        : []),

      ...(country
        ? [
            {
              $match: {
                "userInfo.country": { $regex: country, $options: "i" },
              },
            },
          ]
        : []),

      {
        $facet: {
          totalCount: [{ $count: "total" }],

          data: [
            { $sort: { name: 1, _id: 1 } },
            { $skip: skip },
            { $limit: limit },

            // total hosts
            {
              $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "hostAgency",
                pipeline: [{ $match: { isHost: true } }, { $count: "totalHosts" }],
                as: "hostStats",
              },
            },

            // host earnings
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "parentAgencyId",
                pipeline: [
                  {
                    $match: {
                      type: { $in: [0, 13] },
                      isIncome: true,
                      createdAt: { $gte: startDate, $lte: endDate },
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      total: { $sum: "$rCoin" },
                    },
                  },
                ],
                as: "hostWallet",
              },
            },

            // agency commission
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "agencyId",
                pipeline: [
                  {
                    $match: {
                      type: 17,
                      createdAt: { $gte: startDate, $lte: endDate },
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      total: { $sum: "$rCoin" },
                    },
                  },
                ],
                as: "agencyWallet",
              },
            },

            // bd commission
            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "otherAgencyId",
                pipeline: [
                  {
                    $match: {
                      type: 21,
                      createdAt: { $gte: startDate, $lte: endDate },
                    },
                  },
                  {
                    $group: {
                      _id: null,
                      total: { $sum: "$rCoin" },
                    },
                  },
                ],
                as: "bdWallet",
              },
            },

            {
              $project: {
                name: 1,
                image: 1,
                agencyCode: 1,
                isActive: 1,
                mobile: 1,
                bankDetails: 1,
                country: "$userInfo.country",

                totalHosts: {
                  $ifNull: [{ $arrayElemAt: ["$hostStats.totalHosts", 0] }, 0],
                },

                hostEarnings: {
                  $ifNull: [{ $arrayElemAt: ["$hostWallet.total", 0] }, 0],
                },

                agencyCommission: {
                  $ifNull: [{ $arrayElemAt: ["$agencyWallet.total", 0] }, 0],
                },

                bdCommission: {
                  $ifNull: [{ $arrayElemAt: ["$bdWallet.total", 0] }, 0],
                },
              },
            },
          ],
        },
      },
    ];

    const result = await Agency.aggregate(pipeline);

    const agencies = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.total || 0;

    return res.status(200).json({
      status: true,
      message: "Agencies fetched successfully.",
      total,
      data: agencies,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};

// Agency Detail — cards for a specific agency
exports.agencyDetail = async (req, res) => {
  try {
    const { bdId, agencyId } = req.query;

    if (!bdId || !agencyId) {
      return res.status(200).json({
        status: false,
        message: "BD ID and Agency ID are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId) || !mongoose.Types.ObjectId.isValid(agencyId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid BD ID or Agency ID.",
      });
    }

    const bdObjectId = new mongoose.Types.ObjectId(bdId);
    const agencyObjectId = new mongoose.Types.ObjectId(agencyId);

    let startDate, endDate;

    if (req.query.startDate && req.query.endDate && req.query.startDate !== "all" && req.query.endDate !== "all") {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const thisMonth = getMonthRange(0);
      startDate = thisMonth.start;
      endDate = thisMonth.end;
    }

    const agency = await Agency.findOne({ _id: agencyObjectId, bd: bdObjectId }).select("_id name image agencyCode isActive createdAt").populate("user", "country");

    if (!agency) {
      return res.status(200).json({
        status: false,
        message: "Agency not found under this BD.",
      });
    }

    const hostIds = await User.distinct("_id", {
      hostAgency: agencyObjectId,
      isHost: true,
    });

    const totalHosts = hostIds.length;

    const stats = await Wallet.aggregate([
      {
        $facet: {
          hostEarnings: [
            {
              $match: {
                userId: { $in: hostIds },
                type: { $in: [0, 13] },
                isIncome: true,
                createdAt: { $gte: startDate, $lte: endDate },
              },
            },
            { $group: { _id: null, total: { $sum: "$rCoin" } } },
          ],

          agencyCommission: [
            {
              $match: {
                agencyId: agencyObjectId,
                type: 17,
                createdAt: { $gte: startDate, $lte: endDate },
              },
            },
            { $group: { _id: null, total: { $sum: "$rCoin" } } },
          ],

          bdCommission: [
            {
              $match: {
                bdId: bdObjectId,
                type: 21,
                otherAgencyId: agencyObjectId,
                createdAt: { $gte: startDate, $lte: endDate },
              },
            },
            { $group: { _id: null, total: { $sum: "$rCoin" } } },
          ],
        },
      },
    ]);

    const result = stats[0];

    return res.status(200).json({
      status: true,
      message: "Agency detail fetched successfully.",
      data: {
        agency: {
          _id: agency._id,
          name: agency.name,
          image: agency.image,
          agencyCode: agency.agencyCode,
          country: agency.user?.country || "",
          isActive: agency.isActive,
          createdAt: agency.createdAt,
        },

        cards: {
          totalHosts,
          hostEarnings: result.hostEarnings?.[0]?.total || 0,
          agencyCommission: result.agencyCommission?.[0]?.total || 0,
          bdCommission: result.bdCommission?.[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal server error",
    });
  }
};

//Agency Charts
exports.agencyCharts = async (req, res) => {
  try {
    const { bdId, agencyId } = req.query;

    if (!bdId || !agencyId) {
      return res.status(200).json({
        status: false,
        message: "BD ID and Agency ID are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId) || !mongoose.Types.ObjectId.isValid(agencyId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid BD ID or Agency ID.",
      });
    }

    const bdObjectId = new mongoose.Types.ObjectId(bdId);
    const agencyObjectId = new mongoose.Types.ObjectId(agencyId);

    let startDate, endDate;

    if (req.query.startDate && req.query.endDate && req.query.startDate !== "all" && req.query.endDate !== "all") {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const thisMonth = getMonthRange(0);
      startDate = thisMonth.start;
      endDate = thisMonth.end;
    }

    const agency = await Agency.findOne({ _id: agencyObjectId, bd: bdObjectId }).select("_id");

    if (!agency) {
      return res.status(200).json({
        status: false,
        message: "Agency not found under this BD.",
      });
    }

    const hostIds = await User.distinct("_id", {
      hostAgency: agencyObjectId,
      isHost: true,
    });

    const groupByDay = {
      $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
    };

    const walletStats = await Wallet.aggregate([
      {
        $facet: {
          hostEarnings: hostIds.length
            ? [
                {
                  $match: {
                    userId: { $in: hostIds },
                    type: { $in: [0, 13] },
                    isIncome: true,
                    createdAt: { $gte: startDate, $lte: endDate },
                  },
                },
                { $group: { _id: groupByDay, total: { $sum: "$rCoin" } } },
                { $sort: { _id: 1 } },
              ]
            : [],

          agencyCommission: [
            {
              $match: {
                agencyId: agencyObjectId,
                type: 17,
                createdAt: { $gte: startDate, $lte: endDate },
              },
            },
            { $group: { _id: groupByDay, total: { $sum: "$rCoin" } } },
            { $sort: { _id: 1 } },
          ],

          bdCommission: hostIds.length
            ? [
                {
                  $match: {
                    bdId: bdObjectId,
                    type: 21,
                    otherAgencyId: agencyObjectId,
                    createdAt: { $gte: startDate, $lte: endDate },
                  },
                },
                { $group: { _id: groupByDay, total: { $sum: "$rCoin" } } },
                { $sort: { _id: 1 } },
              ]
            : [],
        },
      },
    ]);

    const stats = walletStats[0];

    return res.status(200).json({
      status: true,
      message: "Agency charts fetched successfully.",
      data: {
        performanceTrend: {
          hostEarnings: stats.hostEarnings,
          agencyCommission: stats.agencyCommission,
          bdCommission: stats.bdCommission,
        },

        monthlyComparison: {
          agencyCommission: stats.agencyCommission,
          bdCommission: stats.bdCommission,
        },
      },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal server error",
    });
  }
};

//Hosts Under Agencies — all hosts across BD's agencies with filters
exports.hostsUnderAgencies = async (req, res) => {
  try {
    const { bdId, search, agencyId, status } = req.query;
    const page = parseInt(req.query.start) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    if (!bdId) {
      return res.status(200).json({ status: false, message: "BD ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(bdId)) {
      return res.status(200).json({ status: false, message: "Invalid BD ID." });
    }

    const bdObjectId = new mongoose.Types.ObjectId(bdId);

    const bdExists = await Bd.exists({ _id: bdObjectId });
    if (!bdExists) {
      return res.status(200).json({ status: false, message: "BD not found." });
    }

    let startDate, endDate;
    if (req.query.startDate && req.query.endDate && req.query.startDate !== "all" && req.query.endDate !== "all") {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const thisMonth = getMonthRange(0);
      startDate = thisMonth.start;
      endDate = thisMonth.end;
    }

    let agencyMatch = { bd: bdObjectId };
    if (agencyId && mongoose.Types.ObjectId.isValid(agencyId)) {
      agencyMatch._id = new mongoose.Types.ObjectId(agencyId);
    }

    const pipeline = [
      { $match: agencyMatch },

      ...(search && search.toLowerCase() !== "all"
        ? [
            {
              $match: {
                $or: [{ name: { $regex: search, $options: "i" } }, ...(Number.isFinite(Number(search)) ? [{ agencyCode: Number(search) }] : [])],
              },
            },
          ]
        : []),

      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "hostAgency",
          pipeline: [
            { $match: { isHost: true } },

            ...(status === "active" ? [{ $match: { isBlock: { $ne: true } } }] : []),
            ...(status === "inactive" ? [{ $match: { isBlock: true } }] : []),

            ...(search && search.toLowerCase() !== "all"
              ? [
                  {
                    $match: {
                      $or: [{ name: { $regex: search, $options: "i" } }, ...(Number.isFinite(Number(search)) ? [{ uniqueId: Number(search) }] : [])],
                    },
                  },
                ]
              : []),

            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "userId",
                pipeline: [
                  {
                    $match: {
                      type: { $in: [0, 13] },
                      isIncome: true,
                      createdAt: { $gte: startDate, $lte: endDate },
                    },
                  },
                  { $group: { _id: null, total: { $sum: "$rCoin" } } },
                ],
                as: "giftWallet",
              },
            },

            {
              $lookup: {
                from: "wallets",
                localField: "_id",
                foreignField: "otherUserId",
                pipeline: [
                  {
                    $match: {
                      type: 17,
                      createdAt: { $gte: startDate, $lte: endDate },
                    },
                  },
                  { $group: { _id: null, total: { $sum: "$rCoin" } } },
                ],
                as: "commissionWallet",
              },
            },

            {
              $project: {
                _id: 1,
                uniqueId: 1,
                name: 1,
                image: 1,
                country: 1,
                hostAgency: 1,
                isBlock: 1,
                createdAt: 1,
                giftEarnings: { $ifNull: [{ $arrayElemAt: ["$giftWallet.total", 0] }, 0] },
                agencyCommissionShare: {
                  $ifNull: [{ $arrayElemAt: ["$commissionWallet.total", 0] }, 0],
                },
              },
            },
          ],
          as: "hosts",
        },
      },

      { $unwind: "$hosts" },

      {
        $project: {
          _id: "$hosts._id",
          uniqueId: "$hosts.uniqueId",
          name: "$hosts.name",
          image: "$hosts.image",
          country: "$hosts.country",
          agencyId: "$_id",
          agencyName: "$name",
          giftEarnings: "$hosts.giftEarnings",
          agencyCommissionShare: "$hosts.agencyCommissionShare",
          isActive: { $not: ["$hosts.isBlock"] },
          createdAt: "$hosts.createdAt",
        },
      },

      { $sort: { name: 1 } },

      {
        $facet: {
          totalCount: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const result = await Agency.aggregate(pipeline);

    const hosts = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.total || 0;

    return res.status(200).json({
      status: true,
      message: "Hosts fetched successfully.",
      total,
      data: hosts,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal server error",
    });
  }
};

//Commission Overview — BD's financial cards
exports.commissionOverview = async (req, res) => {
  try {
    if (!req.query.bdId) {
      return res.status(200).json({ status: false, message: "BD ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.query.bdId)) {
      return res.status(200).json({ status: false, message: "Invalid BD ID." });
    }

    const bdId = new mongoose.Types.ObjectId(req.query.bdId);

    const bd = await Bd.findById(bdId).select("rCoin netCoin totalWithdrawn").lean();

    if (!bd) {
      return res.status(200).json({ status: false, message: "BD not found." });
    }

    let startDate, endDate;

    if (req.query.startDate && req.query.endDate && req.query.startDate !== "all" && req.query.endDate !== "all") {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const thisMonth = getMonthRange(0);
      startDate = thisMonth.start;
      endDate = thisMonth.end;
    }

    const [pendingSettlementAgg, trendAgg] = await Promise.all([
      BdRedeem.aggregate([
        {
          $match: {
            bd: bdId,
            status: "pending",
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$rCoin" },
          },
        },
      ]),

      Wallet.aggregate([
        {
          $match: {
            bdId: bdId,
            type: 21,
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            total: { $sum: "$rCoin" },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: "$_id",
            bdCommission: "$total",
          },
        },
      ]),
    ]);

    const pendingSettlement = pendingSettlementAgg[0]?.total || 0;

    return res.status(200).json({
      status: true,
      message: "Commission overview fetched successfully.",
      data: {
        cards: {
          totalBdCommission: bd.rCoin,
          withdrawableBalance: bd.netCoin,
          pendingSettlement,
          totalSettled: bd.totalWithdrawn,
        },
        trend: trendAgg,
      },
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      status: false,
      error: error.message || "Internal server error",
    });
  }
};

// Commission Breakdown (per agency per month)
exports.commissionBreakdown = async (req, res) => {
  try {
    if (!req.query.bdId) {
      return res.status(200).json({ status: false, message: "BD ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(req.query.bdId)) {
      return res.status(200).json({ status: false, message: "Invalid BD ID." });
    }

    const bdId = new mongoose.Types.ObjectId(req.query.bdId);

    const page = parseInt(req.query.start) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const bdExists = await Bd.exists({ _id: bdId });

    if (!bdExists) {
      return res.status(200).json({ status: false, message: "BD not found." });
    }

    const agencyIds = await Agency.distinct("_id", { bd: bdId });

    if (agencyIds.length === 0) {
      return res.status(200).json({
        status: true,
        message: "Commission breakdown fetched successfully.",
        total: 0,
        data: [],
      });
    }

    const pipeline = [
      {
        $match: {
          $or: [
            { type: { $in: [0, 13] }, parentAgencyId: { $in: agencyIds } },
            { type: 17, agencyId: { $in: agencyIds } },
            { type: 21, bdId: bdId, otherAgencyId: { $in: agencyIds } },
          ],
        },
      },

      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            agencyId: {
              $switch: {
                branches: [
                  { case: { $eq: ["$type", 17] }, then: "$agencyId" },
                  { case: { $eq: ["$type", 21] }, then: "$otherAgencyId" },
                  { case: { $in: ["$type", [0, 13]] }, then: "$parentAgencyId" },
                ],
                default: null,
              },
            },
          },
          agencyCommission: { $sum: { $cond: [{ $eq: ["$type", 17] }, "$rCoin", 0] } },
          bdCommission: { $sum: { $cond: [{ $eq: ["$type", 21] }, "$rCoin", 0] } },
          hostContribution: { $sum: { $cond: [{ $in: ["$type", [0, 13]] }, "$rCoin", 0] } },
        },
      },

      {
        $lookup: {
          from: "agencies",
          localField: "_id.agencyId",
          foreignField: "_id",
          as: "agencyDetails",
          pipeline: [{ $project: { _id: 1, name: 1 } }],
        },
      },

      { $unwind: "$agencyDetails" },

      {
        $facet: {
          totalResults: [{ $count: "total" }],
          data: [
            { $sort: { "_id.month": -1, "agencyDetails.name": 1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                date: { $concat: ["$_id.month", "-01"] },
                agencyName: "$agencyDetails.name",
                hostContribution: 1,
                agencyCommission: 1,
                bdCommission: 1,
              },
            },
          ],
        },
      },
    ];

    const result = await Wallet.aggregate(pipeline);

    const total = result[0]?.totalResults?.[0]?.total || 0;
    const data = result[0]?.data || [];

    return res.status(200).json({
      status: true,
      message: "Commission breakdown fetched successfully.",
      total,
      data,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      status: false,
      error: error.message || "Internal server error",
    });
  }
};

// get setting for BD
exports.getBdSetting = async (req, res) => {
  try {
    const { bdId } = req.query;

    if (!bdId || !mongoose.Types.ObjectId.isValid(bdId)) {
      return res.status(200).json({
        status: false,
        message: "Valid bdId is required.",
      });
    }

    const bd = await Bd.findById(bdId).select("_id").lean();

    if (!bd) {
      return res.status(200).json({
        status: false,
        message: "BD not found.",
      });
    }

    const setting = settingJSON;

    if (!setting) {
      return res.status(200).json({
        status: false,
        message: "Setting not found.",
      });
    }

    const settingPayload = {
      rCoinForCashOut: setting.rCoinForCashOut,
      minRcoinForCashOutBd: setting.minRcoinForCashOutBd,
      currency: setting.currency,
    };
    return res.status(200).json({
      status: true,
      message: "Setting fetched successfully.",
      data: settingPayload,
    });
  } catch (error) {
    console.log("getBdSetting error", error);
    return res.status(500).json({
      status: false,
      error: error.message || "Internal server error",
    });
  }
};
