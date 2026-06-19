const Agency = require("./agency.model");
const User = require("../user/user.model");
const Redeem = require("../redeem/redeem.model");
const Wallet = require("../wallet/wallet.model");
const Bd = require("../bd/bd.model");

const { deleteFile } = require("../../util/deleteFile");

const fs = require("fs");

const jwt = require("jsonwebtoken");
const { JWT_SECRET, baseURL } = require("../../config");

const config = require("../../config");

//mongoose
const mongoose = require("mongoose");

//private key
const admin = require("../../util/privateKey");

//create agency
exports.store = async (req, res) => {
  try {
    if (!req.body.name || !req.body.agencyCode || !req.body.uniqueId || !req.body.mobile || !req.body.bankDetails || !req.body.bdId) {
      // deleteFile(req.file);
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const [user, agencyUser, agencyCode, agencyName, bd] = await Promise.all([
      User.findOne({ uniqueId: req.body.uniqueId }),
      Agency.exists({ uniqueId: parseInt(req.body.uniqueId) }),
      Agency.exists({ agencyCode: parseInt(req.body.agencyCode) }),
      Agency.exists({
        name: { $regex: new RegExp(`^${req.body.name.trim()}$`, "i") },
      }),
      Bd.exists({ _id: req.body.bdId }),
    ]);

    if (!user) {
      // deleteFile(req.file);
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isHost) {
      // deleteFile(req.file);
      return res.status(200).json({ status: false, message: "User is already host." });
    }

    if (agencyUser) {
      // deleteFile(req.file);
      return res.status(200).json({
        status: false,
        message: "agency already exists for that user.",
      });
    }

    if (agencyCode) {
      // deleteFile(req.file);
      return res.status(200).json({
        status: false,
        message: "agency already exists with that agency code.Try with new agency code.",
      });
    }

    if (agencyName) {
      // deleteFile(req.file);
      return res.status(200).json({
        status: false,
        message: "agency already exists with that name.",
      });
    }

    if (!bd) {
      // deleteFile(req.file);
      return res.status(200).json({ status: false, message: "BD does not found." });
    }

    const agency = new Agency();
    agency.name = req.body.name.trim();
    agency.bankDetails = req.body.bankDetails.trim();
    agency.image = user.image;
    agency.agencyCode = req.body.agencyCode;
    agency.uniqueId = user.uniqueId;
    agency.user = user._id;
    agency.mobile = req.body.mobile;
    agency.bd = req.body.bdId;
    agency.loginString = config?.AGENCY_PATH + "?id=" + agency._id;
    await agency.save();

    const [data, updatedUser] = await Promise.all([
      Agency.findById(agency._id).populate("user", "name userName image"),
      User.updateOne(
        { _id: user._id },
        {
          $set: {
            isAgency: true,
            agency: agency._id,
            agencyCode: agency.agencyCode,
            agencyLoginString: agency.loginString,
          },
        }
      ),
    ]);

    return res.status(200).json({ status: true, message: "Success", data: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server error" });
  }
};

//update agency
exports.update = async (req, res) => {
  try {
    const agency = await Agency.findById(req.query.agencyId);
    if (!agency) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "Agency not Found." });
    }

    if (req?.file) {
      const image = agency?.image.split("storage");
      if (image) {
        if (fs.existsSync("storage" + image[1])) {
          fs.unlinkSync("storage" + image[1]);
        }
      }

      agency.image = baseURL + req.file.path;
    }

    agency.name = req.body.name ? req.body.name : agency.name;
    agency.bankDetails = req.body.bankDetails ? req.body.bankDetails.trim() : agency.bankDetails;
    await agency.save();

    const data = await Agency.findById(agency._id).populate("user", "name userName image");

    return res.status(200).json({ status: true, message: "Success", data: data });
  } catch (error) {
    deleteFile(req.file);
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//active or not agency
exports.activeOrNot = async (req, res) => {
  try {
    const agencyId = new mongoose.Types.ObjectId(req.query.agencyId);

    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(200).json({ status: false, message: "Agency not Found." });
    }

    const updatedAgency = await Agency.findOneAndUpdate({ _id: agencyId }, { isActive: !agency.isActive }, { new: true }).populate("user", "name image uniqueId");

    await User.findOneAndUpdate({ _id: agency.user }, { isAgency: !agency.isActive });

    return res.status(200).json({ status: true, message: "Success", data: updatedAgency });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal server error" });
  }
};

//get all agency
exports.index = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    let matchQuery = {};
    if (req.query.search != "ALL") {
      matchQuery = {
        name: { $regex: req.query.search, $options: "i" },
      };
    }

    const [total, agency] = await Promise.all([
      Agency.countDocuments({}),
      Agency.find(matchQuery)
        .populate("user", "name uniqueId image")
        .skip((start - 1) * limit)
        .limit(limit)
        .sort({ createdAt: -1 }),
    ]);

    return res.status(200).json({ status: true, message: "Success", total: total, data: agency });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get agency wise host
exports.agencyWiseHost = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const agencyId = new mongoose.Types.ObjectId(req.query.agencyId);

    if (!agencyId) {
      return res.status(200).json({ status: false, message: "Agency Id is required." });
    }

    console.log("agencyId", agencyId);

    const [agency, total, agencyWiseHost] = await Promise.all([
      Agency.findById(agencyId),
      User.countDocuments({ isHost: true, hostAgency: agencyId }),
      User.find({ isHost: true, hostAgency: agencyId })
        .skip((start - 1) * limit)
        .limit(limit)
        .sort("rCoin"),
    ]);

    if (!agency) {
      return res.status(200).json({ status: false, message: "Agency not Found." });
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      total: total,
      data: agencyWiseHost,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get all agency with agency code dropdown when create host request by user (client)
exports.getAgency = async (req, res) => {
  try {
    let matchQuery = {
      isActive: true,
    };

    if (req.query?.search?.toLowerCase() != "all") {
      const search = req.query?.search || "";
      const searchNum = parseInt(search);

      matchQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        ...(isNaN(searchNum) ? [] : [{ agencyCode: searchNum }, { uniqueId: searchNum }]),
      ];
    }
    const agency = await Agency.find(matchQuery)
      .select("_id name agencyCode")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ status: true, message: "Success", data: agency });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//agency login
exports.login = async (req, res) => {
  try {
    if (!req.body.uniqueId || !req.body.agencyCode) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const agency = await Agency.findOne({
      uniqueId: parseInt(req.body.uniqueId),
      agencyCode: parseInt(req.body.agencyCode),
    });

    if (!agency) {
      return res.status(200).json({
        status: false,
        message: "agency does not found with that agency code for that user.",
      });
    }

    if (!agency.isActive) {
      return res.status(200).json({
        status: false,
        message: "Agency is not active.Contact Bd for further details",
      });
    }

    if (!agency.isVerified) {
      return res.status(200).json({
        status: false,
        message: "You are not verified yet.Wait for verification or contact Bd for further details",
      });
    }

    const payload = {
      _id: agency._id,
      name: agency.name,
      image: agency.image,
      agencyCode: agency.agencyCode,
    };

    const token = jwt.sign(payload, JWT_SECRET);

    return res.status(200).json({ status: true, message: "Success", token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      error: error.errors || error.message || "server error",
    });
  }
};

//get agency profile
exports.getAgencyProfile = async (req, res) => {
  try {
    if (!req.query.agencyId) {
      return res.status(200).json({ status: false, message: "Invalid details." });
    }

    let [agency, totalAgencyWiseHost] = await Promise.all([Agency.findOne({ _id: req.query.agencyId }), User.countDocuments({ isHost: true, hostAgency: req.query.agencyId })]);

    if (!agency) {
      return res.status(200).json({ status: false, message: "Agency does not found." });
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      data: { ...agency._doc, totalAgencyWiseHost },
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//get user's redeem requests who is under particular agency
exports.getUserRedeem = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    if (!req.query.type || !req.query.agencyId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const agency = await Agency.findById(req.query.agencyId);
    if (!agency) {
      return res.status(200).json({ status: false, message: "Agency not Found." });
    }

    let redeem;
    if (req.query.type.trim() === "pending") {
      redeem = await Redeem.find({ status: 0, agencyId: agency._id })
        .populate({
          path: "userId",
          select: "name image uniqueId",
        })
        .sort({ createdAt: -1 })
        .skip((start - 1) * limit)
        .limit(limit);
    }

    if (req.query.type.trim() === "accept") {
      redeem = await Redeem.find({ status: 1, agencyId: agency._id })
        .populate({
          path: "userId",
          select: "name image uniqueId",
        })
        .sort({ createdAt: -1 })
        .skip((start - 1) * limit)
        .limit(limit);
    }

    if (req.query.type.trim() === "decline") {
      redeem = await Redeem.find({ status: 2, agencyId: agency._id })
        .populate({
          path: "userId",
          select: "name image uniqueId",
        })
        .sort({ createdAt: -1 })
        .skip((start - 1) * limit)
        .limit(limit);
    }

    return res.status(200).json({ status: true, message: "Success", redeem });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.agencyWiseHostHistory = async (req, res) => {
  try {
    if (!req.query.agencyId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const agencyId = new mongoose.Types.ObjectId(req.query.agencyId);

    const [agency, agencyWiseHost] = await Promise.all([Agency.findById(agencyId), User.find({ isHost: true, hostAgency: agencyId })]);
    if (!agency) {
      return res.status(200).json({ status: false, message: "Agency not Found." });
    }

    const userIds = agencyWiseHost.map((host) => host._id);

    const history = await Wallet.aggregate([
      { $match: { userId: { $in: userIds } } }, // Match documents where userId is in the list of user IDs
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$userId",
          totalRCoin: { $sum: "$rCoin" }, // Sum the rCoin field for each userId
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
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
        $project: {
          _id: 1,
          totalRCoin: 1,
          userName: "$user.name",
          userId: "$user._id",
          uniqueId: "$user.uniqueId",
          image: "$user.image",
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success",
      data: history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.createHost = async (req, res) => {
  try {
    if (!req.query.agencyId || !req.query.userId) {
      // send user uniqueId and _id of agency in query amd
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const [agency, user] = await Promise.all([Agency.findById(req.query.agencyId), User.findOne({ uniqueId: req.query.userId })]);

    if (!agency) {
      return res.status(200).json({ status: false, message: "agency not found." });
    }

    if (!user) {
      return res.status(200).json({ status: false, message: "User not found." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "User is blocked by admin." });
    }

    // if (user.isHost) {
    //   return res
    //     .status(200)
    //     .json({ status: false, message: "User is already host." });
    // }

    if (user.isAgency) {
      return res.status(200).json({ status: false, message: "User is already an agency." });
    }

    if (agency.isActive === false) {
      return res.status(200).json({ status: false, message: "Agency is not active." });
    }

    await user.save();

    res.status(200).json({ status: true, message: "Success" });

    if (user && user.fcmToken && user.fcmToken !== null) {
      const adminPromise = await admin;

      const payload = {
        token: user.fcmToken,
        notification: {
          body: "Click here to become host and earn $",
          title: "Host Request",
        },
        data: {
          data: `${agency.agencyCode}`,
          type: "HOSTREQUEST",
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.getAgency = async (req, res) => {
  try {
    const agency = await Agency.find({ isActive: true }).select("_id name agencyCode");

    return res.status(200).json({ status: true, message: "Success", data: agency });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
