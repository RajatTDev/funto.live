const VIPPlan = require("./vipPlan.model");
const VIPPlanHistory = require("./vipPlanHistory.model");
const User = require("../user/user.model");
const mongoose = require("mongoose");

//google play
const Verifier = require("google-play-billing-validator");

//get vip plans
exports.index = async (req, res) => {
  try {
    const vipPlan = await VIPPlan.find({ isDelete: false })
      .sort({
        validityType: 1,
        validity: 1,
      })
      .lean();

    if (!vipPlan) return res.status(200).json({ status: false, message: "No data found!" });

    return res.status(200).json({ status: true, message: "Success!!", vipPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// create vip plan
exports.store = async (req, res) => {
  try {
    if (!req.body.validity || !req.body.validityType || !req.body.dollar || !req.body.productKey) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const vipPlan = new VIPPlan();

    vipPlan.name = req.body.name;
    vipPlan.validity = req.body.validity;
    vipPlan.validityType = req.body.validityType;
    vipPlan.dollar = req.body.dollar;
    // vipPlan.rupee = req.body.rupee;
    vipPlan.tag = req.body.tag;
    vipPlan.productKey = req.body.productKey;

    await vipPlan.save();

    return res.status(200).json({ status: true, message: "Success!", vipPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// update vip plan
exports.update = async (req, res) => {
  try {
    const vipPlan = await VIPPlan.findById(req.params.planId);

    if (!vipPlan) {
      return res.status(200).json({ status: false, message: "Plan does not Exist!" });
    }

    if (req.body.name) {
      vipPlan.name = req.body.name;
    }

    vipPlan.validity = req.body.validity;
    vipPlan.validityType = req.body.validityType;
    vipPlan.dollar = req.body.dollar;
    // vipPlan.rupee = req.body.rupee;
    vipPlan.tag = req.body.tag;
    vipPlan.productKey = req.body.productKey;

    await vipPlan.save();

    return res.status(200).json({ status: true, message: "Success!", vipPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// delete vipPlan
exports.destroy = async (req, res) => {
  try {
    const vipPlan = await VIPPlan.findById(req.params.planId);

    if (!vipPlan) return res.status(200).json({ status: false, message: "Plan does not Exist!" });

    vipPlan.isDelete = true;

    await vipPlan.save();

    return res.status(200).json({ status: true, message: "Success!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//auto renewal switch
exports.renewalSwitch = async (req, res) => {
  try {
    const vipPlan = await VIPPlan.findById(req.params.planId);

    if (!vipPlan) return res.status(200).json({ status: false, message: "Plan does not Exist!" });

    vipPlan.isAutoRenew = !vipPlan.isAutoRenew;
    await vipPlan.save();

    return res.status(200).json({ status: true, message: "Success!", vipPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//add plan through stripe API
exports.payStripe = async (req, res) => {
  try {
    if (req.body.userId && req.body.planId && req.body.currency) {
      const user = await User.findById(req.body.userId).populate("level liveJoinSvga avatarFrame");
      if (!user) {
        return res.send({
          status: false,
          message: "User does not exist!!",
          user: "",
        });
      }

      const plan = await VIPPlan.findById(req.body.planId);

      console.log("plan._id", plan._id);
      if (!plan) {
        return res.send({
          status: false,
          message: "Plan does not exist!!",
          user: "",
        });
      }

      // const stripe = require("stripe")(settingJSON ? settingJSON.stripeSecretKey : "");

      // let intent;
      // if (req.body.payment_method_id) {
      //   // Create the PaymentIntent
      //   intent = await stripe.paymentIntents.create({
      //     payment_method: req.body.payment_method_id,
      //     amount:
      //       req.body.currency === "inr" ? plan.rupee * 100 : plan.dollar * 100,
      //     currency: req.body.currency,
      //     confirmation_method: "manual",
      //     confirm: true,
      //   });
      // } else if (req.body.payment_intent_id) {
      //   intent = await stripe.paymentIntents.confirm(
      //     req.body.payment_intent_id
      //   );
      // }

      // // Send the response to the client
      // if (
      //   intent !== undefined &&
      //   intent.status === "requires_action" &&
      //   intent.next_action.type === "use_stripe_sdk"
      // ) {
      //   // Tell the client to handle the action
      //   return res.send({
      //     status: true,
      //     requires_action: true,
      //     payment_intent_client_secret: intent.client_secret,
      //   });
      // } else if (intent !== undefined && intent.status === "succeeded") {
      //   // The payment didn’t need any additional actions and completed!
      //   // Handle post-payment fulfillment
      user.isVIP = true;
      user.plan.planStartDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      user.plan.planId = plan._id;

      const history = new VIPPlanHistory();
      history.userId = user._id;
      history.planId = plan._id;
      history.paymentGateway = req?.body?.paymentGateway ?? "Other";
      history.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

      await Promise.all([user.save(), history.save()]);

      return res.send({
        status: true,
        message: "Success!",
        user,
      });
      // } else {
      //   // Invalid status
      //   return res.send({
      //     status: false,
      //     message: "Invalid PaymentIntent status",
      //     user: "",
      //   });
      // }
    } else {
      return res.send({
        status: false,
        message: "Invalid Details!",
        user: null,
      });
    }
  } catch (e) {
    console.log(e);
    // Display error on client
    return res.send({ status: false, error: e.message, user: {} });
  }
};

//add plan through google play
exports.payGooglePlay = async (req, res) => {
  try {
    if (!req.body.packageName && !req.body.token && !req.body.productId && !req.body.userId && !req.body.planId) return res.status(200).json({ status: false, message: "Invalid Details!", user: {} });

    const [user, plan] = await Promise.all([User.findById(req.body.userId).populate("level liveJoinSvga avatarFrame"), VIPPlan.findById(req.body.planId)]);

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!", user: {} });
    }

    if (!plan) {
      return res.status(200).json({ status: false, message: "Plan does not Exist!", user: {} });
    }

    // const options = {
    //   email: settingJSON ? settingJSON.googlePlayEmail : "",
    //   key: settingJSON ? settingJSON.googlePlayKey : "",
    // };

    // const verifier = new Verifier(options);

    // var packageName = req.body.packageName;
    // var token = req.body.token;
    // var productId = req.body.productId;
    // let receipt = {
    //   packageName,
    //   productId, // sku = productId subscription id
    //   purchaseToken: token,
    // };

    // let promiseData = await verifier.verifyINAPP(receipt);

    // if (promiseData.isSuccessful) {
    user.isVIP = true;
    user.plan.planStartDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    user.plan.planId = plan._id;

    const history = new VIPPlanHistory();
    history.userId = user._id;
    history.planId = plan._id;
    history.paymentGateway = "Google Play";
    history.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    await Promise.all([user.save(), history.save()]);

    return res.status(200).json({ status: true, message: "success", user });
    // } else {
    //   return res
    //     .status(200)
    //     .json({ status: false, message: promiseData.errorMessage, user: {} });
    // }
  } catch (error) {
    console.log(error);
    return res.status(200).json({
      status: false,
      message: error.errorMessage || "Server Error",
      user: "",
    });
  }
};

// get purchase plan history of user
exports.purchaseHistory = async (req, res) => {
  try {
    let matchQuery = {};
    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const addFieldQuery = {
      shortDate: {
        $toDate: { $arrayElemAt: [{ $split: ["$date", ", "] }, 0] },
      },
    };

    let dateFilterQuery = {};

    if (req.query.startDate !== "ALL" && req.query.endDate !== "ALL") {
      sDate = req.query.startDate + "T00:00:00.000Z";
      eDate = req.query.endDate + "T00:00:00.000Z";

      dateFilterQuery = {
        shortDate: {
          $gte: new Date(sDate),
          $lte: new Date(eDate),
        },
      };
    }

    if (req.query.userId) {
      if (!mongoose.Types.ObjectId.isValid(req.query.userId)) {
        return res.status(200).json({ status: false, message: "Invalid user id!!" });
      }

      matchQuery = { userId: new mongoose.Types.ObjectId(req.query.userId) };
    }

    const [history] = await Promise.all([
      VIPPlanHistory.aggregate([
        {
          $match: matchQuery,
        },
        {
          $addFields: addFieldQuery,
        },
        {
          $match: dateFilterQuery,
        },
        {
          $facet: {
            history: [
              { $sort: { _id: -1 } },
              { $skip: (start - 1) * limit }, // how many records you want to skip
              { $limit: limit },

              {
                $lookup: {
                  from: "users",
                  localField: "userId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $project: {
                        name: 1,
                        uniqueId: 1,
                        image: 1,
                        username: 1,
                      },
                    },
                  ],
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
                $lookup: {
                  from: "vipplans",
                  localField: "planId",
                  foreignField: "_id",
                  pipeline: [
                    {
                      $project: {
                        dollar: 1,
                        rupee: 1,
                        validity: 1,
                        validityType: 1,
                      },
                    },
                  ],
                  as: "plan",
                },
              },
              {
                $unwind: {
                  path: "$plan",
                  preserveNullAndEmptyArrays: false,
                },
              },
              {
                $project: {
                  paymentGateway: 1,
                  name: "$user.name",
                  uniqueId: "$user.uniqueId",
                  image: "$user.image",
                  username: "$user.username",
                  dollar: "$plan.dollar",
                  rupee: "$plan.rupee",
                  validity: "$plan.validity",
                  validityType: "$plan.validityType",
                  purchaseDate: "$date",
                },
              },
            ],
            pageInfo: [
              { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
            ],
          },
        },
      ]),
    ]);

    return res.status(200).json({
      status: true,
      message: "Success!!",
      total: history[0].pageInfo.length > 0 ? history[0].pageInfo[0].totalRecord : 0,
      history: history[0].history || [],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.isTopToggle = async (req, res, next) => {
  try {
    const vipPlan = await VIPPlan.findById(req.query.planId);

    if (!vipPlan) {
      return res.status(200).json({ status: false, message: "VipPlan not found" });
    }
    vipPlan.isTop = !vipPlan.isTop;

    const topPlan = await VIPPlan.find({
      isTop: true,
      _id: { $ne: vipPlan._id },
    });
    if (topPlan.length > 0 && vipPlan.isTop) {
      return res.status(200).json({
        status: false,
        message: "overflow ! only one VipPlan allowed in Top vipPlan.",
      });
    }
    await vipPlan.save();

    return res.status(200).json({ status: true, message: "success", data: vipPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "server error" });
  }
};
