const AgencyRedeem = require("./agencyRedeem.model");
const Agency = require("../agency/agency.model");

const moment = require("moment");

//redeem request by agency
exports.store = async (req, res) => {
  try {
    if (!req.body.agencyId || !req.body.description || !req.body.coin) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const agency = await Agency.findById(req.body.agencyId);

    if (!agency) {
      return res.status(200).json({ status: false, message: "Agency Does not found." });
    }

    if (!agency.isActive) {
      return res.status(200).json({ status: false, message: "Your account is inactive." });
    }

    console.log("agency.rCoin", agency.rCoin);

    if (agency.rCoin <= 0 || agency.rCoin < settingJSON.minRcoinForCashOutAgency || agency.rCoin < req.body.coin) {
      return res.status(200).json({
        status: false,
        message: "You Don't Have Enough Coin for withdrawal.Minimum Withdrawal Coin Required: " + settingJSON.minRcoinForCashOutAgency,
      });
    }

    if (req.body.coin < settingJSON.minRcoinForCashOutAgency) {
      return res.status(200).json({
        status: false,
        message: "Minimum Withdrawal Coin Required: " + settingJSON.minRcoinForCashOutAgency,
      });
    }

    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "setting does not found." });
    }

    const alreadyAgencyRedeem = await AgencyRedeem.find({
      agency: agency._id,
      status: 1,
    });

    if (alreadyAgencyRedeem.length > 0) {
      return res.status(200).json({
        status: false,
        message: "Previous Cash Out Request is still pending.Try after the request is done.",
      });
    }

    const agencyRedeem = new AgencyRedeem();

    agencyRedeem.agency = agency._id;
    agencyRedeem.description = req.body.description;
    agencyRedeem.rCoin = req.body.coin;
    agencyRedeem.amount = parseFloat(agencyRedeem.rCoin / settingJSON.rCoinForCashOut).toFixed(2);
    agencyRedeem.date = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    agencyRedeem.bankDetails = agency.bankDetails;

    agency.rCoin -= agencyRedeem.rCoin;

    await Promise.all([agencyRedeem.save(), agency.save()]);

    return res.status(200).json({ status: true, message: "Success", data: agencyRedeem });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "server error" });
  }
};

//accept or decline the redeem request of agency by admin
exports.update = async (req, res) => {
  try {
    const agencyRedeem = await AgencyRedeem.findById(req.query.agencyRedeemId);
    if (!agencyRedeem) {
      return res.status(200).json({ status: false, message: "agency request does not found." });
    }

    const agency = await Agency.findById(agencyRedeem.agency);
    if (!agency) {
      return res.status(200).json({ status: false, message: "Agency Does not found." });
    }

    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "setting does not found." });
    }

    if (req.query.type === "accept") {
      if (agencyRedeem.status == 2) {
        return res.status(200).json({
          status: false,
          message: "agency redeem request already accepted by the admin.",
        });
      }

      if (agencyRedeem.status == 3) {
        return res.status(200).json({
          status: false,
          message: "agency redeem request already declined by the admin.",
        });
      }

      agencyRedeem.status = 2;
      agencyRedeem.amount = parseFloat(agencyRedeem.rCoin / settingJSON.rCoinForCashOut).toFixed(2);
      agencyRedeem.acceptDeclineDate = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });

      agency.totalWithdrawnCoin += agencyRedeem.rCoin;

      await Promise.all([agencyRedeem.save(), agency.save()]);

      return res.status(200).json({ status: true, message: "Success", data: agencyRedeem });
    } else if (req.query.type === "decline") {
      if (!req.query.reason) {
        return res.status(200).json({
          status: false,
          message: "reason is required.",
        });
      }

      if (agencyRedeem.status == 2) {
        return res.status(200).json({
          status: false,
          message: "agency redeem request already accepted by the admin.",
        });
      }

      if (agencyRedeem.status == 3) {
        return res.status(200).json({
          status: false,
          message: "agency redeem request already declined by the admin.",
        });
      }

      agencyRedeem.status = 3;
      agencyRedeem.acceptDeclineDate = new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      });
      agencyRedeem.reason = req.query.reason ? req.query.reason : "";

      const agency = await Agency.findById(agencyRedeem.agency);
      if (agency) {
        agency.rCoin += agencyRedeem.rCoin;
      }

      await Promise.all([agencyRedeem.save(), agency ? agency.save() : null]);

      return res.status(200).json({ status: true, message: "Success", data: agencyRedeem });
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid." });
    }
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "server error" });
  }
};

//get redeem request of agency for admin
exports.getAgencyRedeem = async (req, res) => {
  try {
    if (!req.query.type) {
      return res.status(200).json({ status: true, message: "type must be requried." });
    }

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    let pipeline = [];

    let agencyRedeem, total;
    const month = req.query.month || moment().format("YYYY-MM");

    if (req.query.type.trim() === "pending") {
      pipeline = [
        {
          $match: {
            status: 1,
          },
        },
        {
          $lookup: {
            from: "agencies",
            localField: "agency",
            foreignField: "_id",
            as: "agency",
          },
        },
        { $unwind: "$agency" },
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
      ];
      if (req.query.search != "ALL") {
        pipeline.push({
          $match: {
            "agency.name": { $regex: req.query.search, $options: "i" },
          },
        });
      }
      [agencyRedeem, total] = await Promise.all([AgencyRedeem.aggregate(pipeline), AgencyRedeem.countDocuments({ status: 1 })]);
    } else if (req.query.type.trim() === "accept") {
      pipeline = [
        {
          $match: {
            status: 2,
          },
        },
        {
          $lookup: {
            from: "agencies",
            localField: "agency",
            foreignField: "_id",
            as: "agency",
          },
        },
        { $unwind: "$agency" },
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
      ];
      if (req.query.search != "ALL") {
        pipeline.push({
          $match: {
            "agency.name": { $regex: req.query.search, $options: "i" },
          },
        });
      }
      [agencyRedeem, total] = await Promise.all([AgencyRedeem.aggregate(pipeline), AgencyRedeem.countDocuments({ status: 2 })]);
    } else if (req.query.type.trim() === "decline") {
      pipeline = [
        {
          $match: {
            status: 3,
          },
        },
        {
          $lookup: {
            from: "agencies",
            localField: "agency",
            foreignField: "_id",
            as: "agency",
          },
        },
        { $unwind: "$agency" },
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
      ];
      if (req.query.search != "ALL") {
        pipeline.push({
          $match: {
            "agency.name": { $regex: req.query.search, $options: "i" },
          },
        });
      }
      [agencyRedeem, total] = await Promise.all([AgencyRedeem.aggregate(pipeline), AgencyRedeem.countDocuments({ status: 3 })]);
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid." });
    }

    return res.status(200).json({ status: true, message: "success", total, data: agencyRedeem });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "server error" });
  }
};

//get redeem request of particular agency
exports.getAgencyWise = async (req, res) => {
  try {
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 20;

    const type = req.query.type || "All";
    if (!req.query.agencyId) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details." });
    }

    const agency = await Agency.findById(req.query.agencyId);
    if (!agency) {
      return res.status(200).json({ status: false, message: "Agency Does Not Found !!" });
    }
    const month = req.query.month || moment().format("YYYY-MM");

    let agencyRedeem, total;

    if (type === "pending") {
      [agencyRedeem, total] = await Promise.all([
        AgencyRedeem.find({ agency: agency._id, status: 1, month })
          .sort({ createdAt: -1 })
          .populate("agency")
          .skip((start - 1) * limit)
          .limit(limit),

        AgencyRedeem.aggregate([
          {
            $match: {
              agency: agency._id,
              status: 1,
              month,
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalRevenue: { $sum: "$rCoin" },
            },
          },
        ]),
      ]);
    } else if (type === "accept") {
      [agencyRedeem, total] = await Promise.all([
        AgencyRedeem.find({ agency: agency._id, status: 2, month })
          .sort({ createdAt: -1 })
          .populate("agency")
          .skip((start - 1) * limit)
          .limit(limit),

        AgencyRedeem.aggregate([
          {
            $match: {
              agency: agency._id,
              status: 2,
              month,
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalRevenue: { $sum: "$rCoin" },
            },
          },
        ]),
      ]);
    } else if (type === "decline") {
      [agencyRedeem, total] = await Promise.all([
        AgencyRedeem.find({ agency: agency._id, status: 3, month })
          .sort({ createdAt: -1 })
          .populate("agency")
          .skip((start - 1) * limit)
          .limit(limit),

        AgencyRedeem.aggregate([
          {
            $match: {
              agency: agency._id,
              status: 3,
              month,
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalRevenue: { $sum: "$rCoin" },
            },
          },
        ]),
      ]);
    } else if (type === "All") {
      [agencyRedeem, total] = await Promise.all([
        AgencyRedeem.find({ agency: agency._id, month: month })
          .sort({ createdAt: -1 })
          .populate("agency")
          .skip((start - 1) * limit)
          .limit(limit),

        AgencyRedeem.aggregate([
          {
            $match: {
              agency: agency._id,
              month,
            },
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              totalRevenue: { $sum: "$rCoin" },
            },
          },
        ]),
      ]);
    } else {
      return res.status(200).json({ status: false, message: "type must be passed valid." });
    }

    return res.status(200).json({
      status: true,
      message: "success",
      total: total?.length > 0 ? total[0].count : 0,
      totalRevenue: total?.length > 0 ? total[0].totalRevenue : 0,
      data: agencyRedeem,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "server error" });
  }
};
