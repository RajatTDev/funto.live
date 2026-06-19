const HostRequest = require("./hostRequest.model");

//import model
const User = require("../user/user.model");
const Agency = require("../agency/agency.model");

const { HOST_PATH } = require("../../config");
const config = require("../../config");

//create host request by particular user
exports.createRequest = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.name || !req.body.bio || !req.body.mobileNumber || !req.body.bankDetails) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const user = await User.findOne({ _id: req.body.userId });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found." });
    }

    if (user.isAgency) {
      return res.status(200).json({ status: false, message: "User is already an agency.cannot be a host" });
    }

    if (user.isHost) {
      return res.status(200).json({ status: false, message: "User is already a host." });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (req.body.agencyCode) {
      const agency = await Agency.findOne({ agencyCode: req.body.agencyCode?.trim() });
      if (!agency) {
        return res.status(200).json({
          status: false,
          message: "agency does not found with that agency code.",
        });
      }

      if (user.agency !== null) {
        if (user.agency.toString() !== agency._id.toString()) {
          return res.status(200).json({
            status: false,
            message: "This user has already been designated to a particular agency.",
          });
        }
      }

      const [pendingExistRequest, declinedExistRequest] = await Promise.all([HostRequest.exists({ user: user._id, status: 1 }), HostRequest.exists({ user: user._id, status: 3 })]);

      if (pendingExistRequest) {
        return res.status(200).json({
          status: false,
          message: "You have already sent the host request to the agency.",
        });
      } else if (declinedExistRequest) {
        await declinedExistRequest.deleteOne();

        await HostRequest.create({
          user: user._id,
          name: req.body.name ? req.body.name : "",
          bankDetails: req.body.bankDetails ? req.body.bankDetails.trim() : "",
          bio: req.body.bio ? req.body.bio : "",
          agencyCode: req.body.agencyCode ? req.body.agencyCode : null,
          type: req.body.agencyCode ? 1 : 2,
          profileImage: req?.files?.profileImage ? config.baseURL + req?.files?.profileImage[0].path : "",
          document: req?.files?.document ? config.baseURL + req?.files?.document[0].path : "",
          mobile: req.body.mobileNumber || "",
          date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        });

        return res.status(200).json({
          status: true,
          message: "Host request already declined by admin and new request has been created.",
        });
      } else {
        await HostRequest.create({
          user: user._id,
          name: req.body.name ? req.body.name : "",
          bankDetails: req.body.bankDetails ? req.body.bankDetails.trim() : "",
          bio: req.body.bio ? req.body.bio : "",
          agencyCode: req.body.agencyCode ? req.body.agencyCode : null,
          type: req.body.agencyCode ? 1 : 2,
          profileImage: req?.files?.profileImage ? config.SERVER_PATH + req?.files?.profileImage[0].path : "",
          mobile: req.body.mobileNumber || "",
          document: req?.files?.document ? config.SERVER_PATH + req?.files?.document[0].path : "",
          date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        });

        return res.status(200).json({ status: true, message: "Host request send to admin." });
      }
    } else {
      const [pendingExistRequest, declinedExistRequest] = await Promise.all([HostRequest.exists({ user: user._id, status: 1 }), HostRequest.findOne({ user: user._id, status: 3 })]);

      if (pendingExistRequest) {
        return res.status(200).json({
          status: false,
          message: "You have already sent the host request to the admin.",
        });
      } else if (declinedExistRequest) {
        await declinedExistRequest.deleteOne();

        await HostRequest.create({
          user: user._id,
          name: req.body.name ? req.body.name : "",
          bankDetails: req.body.bankDetails ? req.body.bankDetails.trim() : "",
          bio: req.body.bio ? req.body.bio : "",
          agencyCode: req.body.agencyCode ? req.body.agencyCode : null,
          mobile: req.body.mobileNumber || "",
          type: req.body.agencyCode ? 1 : 2,
          profileImage: req?.files?.profileImage ? config.SERVER_PATH + req?.files?.profileImage[0].path : "",
          document: req?.files?.document ? config.SERVER_PATH + req?.files?.document[0].path : "",

          date: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        });

        return res.status(200).json({
          status: true,
          message: "Host request already declined by admin and new request has been created.",
        });
      } else {
        await HostRequest.create({
          user: user._id,
          name: req.body.name ? req.body.name : "",
          bankDetails: req.body.bankDetails ? req.body.bankDetails.trim() : "",
          bio: req.body.bio ? req.body.bio : "",
          agencyCode: req.body.agencyCode ? req.body.agencyCode : null,
          mobile: req.body.mobileNumber || "",
          type: req.body.agencyCode ? 1 : 2,
          profileImage: req?.files?.profileImage ? config.SERVER_PATH + req?.files?.profileImage[0].path : "",
          document: req?.files?.document ? config.SERVER_PATH + req?.files?.document[0].path : "",
          date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
        });

        return res.status(200).json({ status: true, message: "Host request send to admin." });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//accept or decline host request by admin
exports.acceptOrDecline = async (req, res) => {
  try {
    if (!req.query.requestId || !req.query.type) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const request = await HostRequest.findById(req.query.requestId);
    if (!request) {
      return res.status(200).json({ status: false, message: "Host Request does not found!" });
    }

    if (request.status == 2) {
      return res.status(200).json({
        status: false,
        message: "host request already accepted by the admin.",
      });
    }

    if (request.status == 3) {
      return res.status(200).json({
        status: false,
        message: "host request already declined by the admin.",
      });
    }

    const user = await User.findOne({ _id: request.user });
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    if (user.isBlock) {
      return res.status(200).json({ status: false, message: "you are blocked by admin!" });
    }

    if (req.query.type === "accept") {
      const agency = await Agency.findOne({ agencyCode: request.agencyCode || req.query.agencyCode });

      if (!agency) {
        return res.status(200).json({ status: false, message: "agency does not found" });
      }



      if (user?.isAgency) {
        await HostRequest.updateOne(
          { _id: request._id },
          {
            $set: {
              status: 3,
              reason: "User is already an agency",
              date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
            },
          }
        );

        return res.status(200).json({ status: false, message: "User is already an agency cannot be a host" });
      }

      if (user?.isHost) {
        await HostRequest.updateOne(
          { _id: request._id },
          {
            $set: {
              status: 3,
              reason: "User is already a host",
              date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
            },
          }
        );

        return res.status(200).json({ status: false, message: "User is already a host." });
      }

      const [updatedRequest, updatedUser] = await Promise.all([
        HostRequest.updateOne(
          { _id: request._id },
          {
            $set: {
              status: 2,
              date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
              agencyCode: agency.agencyCode || req.query.agencyCode,
            },
          }
        ),
        User.findOneAndUpdate(
          { _id: request.user },
          {
            $set: {
              isHost: true,
              hostAgency: agency._id,
              name: request.name,
              bankDetails: request?.bankDetails,
              bio: request.bio,
              hostLoginString: HOST_PATH + "hostlogin?id=" + request.user,
            },
          }
        ),
      ]);

      return res.status(200).json({
        status: true,
        message: "Host request accepted.",
      });
    } else if (req.query.type === "decline") {
      await HostRequest.updateOne(
        { _id: request._id },
        {
          $set: {
            status: 3,
            reason: req.query.reason,
            date: new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
          },
        }
      );

      return res.status(200).json({
        status: true,
        message: "Host request declined.",
      });
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//get all requests
exports.index = async (req, res) => {
  try {
    if (!req.query.type) {
      return res.status(200).json({ status: false, message: "Oops! Invalid details!" });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    let typeQuery = {};
    if (req.query.type !== "All") {
      typeQuery.status = parseInt(req.query.type);
    }

    const [total, request] = await Promise.all([
      HostRequest.countDocuments({ ...typeQuery }),
      HostRequest.find({ ...typeQuery })
        .populate("user", "name userName image")
        .skip((start - 1) * limit)
        .limit(limit)
        .sort({ createdAt: 1 }),
    ]);

    return res.status(200).json({
      status: true,
      message: "Host Request fetch successfully!",
      total: total,
      data: request,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

//add agency
exports.addAgency = async (req, res) => {
  try {
    if (!req.query.requestId || !req.query.agencyId) {
      return res.status(200).json({ status: false, message: "Oops! Invalid details!" });
    }

    const request = await HostRequest.findById(req.query.requestId);
    if (!request) {
      return res.status(200).json({ status: false, message: "Request does not found!" });
    }

    if (request.type !== 2) {
      return res.status(200).json({
        status: false,
        message: "This request has already  an agency!",
      });
    }

    const agency = await Agency.findOne({ agencyCode: req.query.agencyId });
    if (!agency) {
      return res.status(200).json({ status: false, message: "Agency does not found!" });
    }

    request.agencyCode = agency.agencyCode;
    request.type = 1;
    await request.save();

    return res.status(200).json({
      status: true,
      message: "Agency added successfully!",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};

exports.getAgencyWise = async (req, res) => {
  try {
    if (!req.query.agencyId || !req.query.type) {
      return res.status(200).json({ status: false, message: "Oops! Invalid details!" });
    }

    const agency = await Agency.findById(req.query.agencyId);
    if (!agency) {
      return res.status(200).json({ status: false, message: "Agency does not found!" });
    }

    let typeQuery = {};

    typeQuery.status = parseInt(req.query.type);
    const data = await HostRequest.find({
      agencyCode: agency.agencyCode,
      ...typeQuery,
    }).populate("user", "name uniqueId userName image");

    return res.status(200).json({ status: true, data: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};
