const CoinPlan = require("./coinPlan.model");
const VIPPlan = require("../vipPlan/vipPlan.model");
const User = require("../user/user.model");
const Wallet = require("../wallet/wallet.model");
const FakeUser = require("../../userCollection");
const FakeEmail = require("../../emailCollection");

//google play
const Verifier = require("google-play-billing-validator");

//get coin plans
exports.index = async (req, res) => {
  try {
    const coinPlan = await CoinPlan.find({ isDelete: false }).sort({
      diamonds: 1,
    });

    if (!coinPlan) return res.status(200).json({ status: false, message: "No data found!" });

    return res.status(200).json({ status: true, message: "Success!!", coinPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//create coin plan
exports.store = async (req, res) => {
  try {
    if (!req.body.diamonds || !req.body.dollar || !req.body.productKey) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const coinPlan = new CoinPlan();
    coinPlan.diamonds = req.body.diamonds;
    coinPlan.dollar = req.body.dollar;
    // coinPlan.rupee = req.body.rupee;
    coinPlan.tag = req.body.tag;
    coinPlan.productKey = req.body.productKey;
    await coinPlan.save();

    return res.status(200).json({ status: true, message: "Success!", coinPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//update coin plan
exports.update = async (req, res) => {
  try {
    const coinPlan = await CoinPlan.findById(req.params.planId);

    if (!coinPlan) {
      return res.status(200).json({ status: false, message: "Plan does not Exist!" });
    }

    coinPlan.diamonds = req.body.diamonds;
    coinPlan.dollar = req.body.dollar;
    // coinPlan.rupee = req.body.rupee;
    coinPlan.tag = req.body.tag;
    coinPlan.productKey = req.body.productKey;
    await coinPlan.save();

    return res.status(200).json({ status: true, message: "Success!", coinPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//delete coinPlan
exports.destroy = async (req, res) => {
  try {
    const coinPlan = await CoinPlan.findById(req.params.planId);
    if (!coinPlan) return res.status(200).json({ status: false, message: "Plan does not Exist!" });

    coinPlan.isDelete = true;
    await coinPlan.save();

    return res.status(200).json({ status: true, message: "Success!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//add plan through stripe API
exports.payStripe = async (req, res) => {
  try {
    if (req.body.userId && req.body.planId && req.body.currency) {
      const [user, plan] = await Promise.all([User.findById(req.body.userId).populate("level liveJoinSvga avatarFrame"), CoinPlan.findById(req.body.planId)]);

      if (!user) {
        return res.send({
          status: false,
          message: "User does not exist!!",
          user: {},
        });
      }

      if (!plan) {
        return res.send({
          status: false,
          message: "Plan does not exist!!",
          user: {},
        });
      }

      // const stripe = require('stripe')(settingJSON ? settingJSON.stripeSecretKey : '');

      // let intent;

      // if (req.body.payment_method_id) {
      //   const customer = await stripe.customers.create({
      //     email: user?.email,
      //     name: user?.name,
      //     address: {
      //       line1: 'TC 9/4 Old MES colony',
      //       postal_code: '452331',
      //       city: 'Indore',
      //       state: 'Madhya Pradesh',
      //       country: 'India',
      //     },
      //   });
      //   // Create the PaymentIntent
      //   intent = await stripe.paymentIntents.create({
      //     payment_method: req.body.payment_method_id,
      //     amount:
      //       req.body.currency === 'inr' ? plan.rupee * 100 : plan.dollar * 100,
      //     currency: req.body.currency,
      //     confirmation_method: 'manual',
      //     confirm: true,
      //     customer: customer?.id,
      //   });
      // } else if (req.body.payment_intent_id) {
      //   intent = await stripe.paymentIntents.confirm(
      //     req.body.payment_intent_id
      //   );
      // }

      // // Send the response to the client
      // if (
      //   intent !== undefined &&
      //   intent.status === 'requires_action' &&
      //   intent.next_action.type === 'use_stripe_sdk'
      // ) {
      //   // Tell the client to handle the action
      //   return res.send({
      //     status: true,
      //     requires_action: true,
      //     payment_intent_client_secret: intent.client_secret,
      //   });
      // } else if (intent !== undefined && intent.status === 'succeeded') {

      user.diamond += plan.diamonds;
      await user.save();

      const income = new Wallet();
      income.userId = user._id;
      income.diamond = plan.diamonds;
      income.planId = plan._id;
      income.type = 2;
      income.paymentGateway = req?.body?.currency ?? "Other";
      income.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      await income.save();

      return res.send({
        status: true,
        message: "Success!!",
        user,
      });
      // } else {
      //   // Invalid status
      //   return res.send({
      //     status: false,
      //     message: 'Invalid PaymentIntent status',
      //     user: {},
      //   });
      // }
    } else {
      return res.send({
        status: false,
        message: "Invalid Details!",
        user: {},
      });
    }
  } catch (e) {
    console.log(e);
    return res.send({ status: false, error: e.message, user: {} });
  }
};

//add plan through google play
exports.payGooglePlay = async (req, res) => {
  try {
    if (!req.body.packageName && !req.body.token && !req.body.productId && !req.body.userId && !req.body.planId) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const user = await User.findById(req.body.userId).populate("level liveJoinSvga avatarFrame");

    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!", user: {} });
    }

    const plan = await CoinPlan.findById(req.body.planId);
    if (!plan) {
      return res.status(200).json({ status: false, message: "Plan does not Exist!", user: {} });
    }

    // const options = {
    //   email:
    //     'vivinsplay@pc-api-7909492063218540934-641.iam.gserviceaccount.com',
    //   key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCh+rf1T53F83Hg\n2sirIK6iKXdZiyjzjN16fG/mwBn/sUL0EygBk5Ac4YaIfcdqzeq8nugcHFvPCSG9\nRZ6ynANJaC9e9wChZ9MF9Xy6elPU5FZcT6VG/XeTooUmwhc7R18izUGfkuUHDugU\nJWj50STGkbRMiDhsMG36rPSMiPH5Dmk+gNpGx8psvlfxb9hRdYoM2IrdA+E1XLi9\nYfjVTPIzyNZvj/QNwo4XfLvBdJrWUVJr3FZQCzQWhjzgHOq6dl4HstdFNg6atm//\nKk1/8JRZxO7/qmCAQPL2lHkgDqq4wLQVDFCStrY9EFRj2RCtwzR65wz8NRrpY0t6\nxgW6ojHXAgMBAAECggEAKS0nHoFCxlOAm3yCjp4cRrTr1iN+IYupsb14ZNxov4s8\nTfegr+XnOLBMFt6ClzAJgDGVJ7A91n+nyAmushDe9QY7JJT94AoYpuck8fKu5Ou2\n2HiWt1kv0KP73UJxzWvzT1GGYR5igkzTymtIKFl2U9QuVVY7oaUeEB9ve1pEyN7t\nTeDCWS07a7F3/8GbpRGv9YqB2Uw4BW03fnq+eN2pTL992hiaiPXBYuLNWzz8blwC\n7SPjBauwNV0plbzvoQ+8f6z7uGH6/WT4AcFMeZbwKtJh0c+RprcECNCi6yRomqTz\nJTGyQADDAY+1WTnZmiPRnCuDVgMQsDI8bjOkCFYmQQKBgQDWihuZ6gmnzD2moieY\noDv9QCzecK2ONwSBTXgHbmKPESOToaXYOJaYK4MqORGK2tmSw3cdzfkrT3NSzHs1\nR+S2ImxWS5ofNaTSAGrmwNedfmz26LRcOdG1ty1s12eOMzEVM9mwqE+BMBT+h6fi\n5v48EDhLfwXM285e8JTvXQRTGQKBgQDBSE8e5VLPFRZdFZqPH/apJYKvn1IvkIzB\nLxiEvRY9W+sbMl8Q7e//IbEo08Scn5JIF2suKHmSv9yIy45zCPuJDKbEQfz/UuA9\nVLdwKupY3aPeNct90SZciSZUclYLJEzXs5P+PNekJJqbXLoUFZtNHXdCyXyltoDB\nBCLqirK6bwKBgQDMveC5cnDkgjYT4IyJS+H0PlqTrlTzc+4IuDXkYaQNhP2+1nW/\nc8HEV0JF+VCUg2dAeOokt30jqB8W1a5/mqzaZN+fO2dKgZdaEqvyq/cZhp3WxR3b\nJhLMqJPhW3CodJJS+bi2rumxEIH4pt3B3VCjYZdX9VFDwEGiuVZpWQvXgQKBgDEp\nEB6+m0JajbadUROIQLei98ttjXzVmkdkkCrq4SY4I+Nl+3IV4s4UprfIrSBdIdq+\nQh+aYdmmfRQ6GgA+T6P7GMugMRZL4QcYbhPUhoiVzyEss5ZLxSMSKzKdZi8tS3It\nlb27gemY+c38VsPW/wotLXFKSC7p7XOqdqsLHgx3AoGAP753BeOytJ37DTNxDOfP\nyTD9trugWmMG1RF/JB1PXJ3/kcpEfq7cLD3RNtdmKwzqpG0rsA7IrBxhCZAj9dv2\n87T83d2qt0aJz3jq5b3rsKji5FQymvSOMAsXSB4Mm/Mo1qOsAiwlId+btkpBwhwr\n67ZR2GGF1qYk7hJDMW0YoYc=\n-----END PRIVATE KEY-----\n',
    // };
    // console.log('>>>>>>>>>>>>>>>>>', options);

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

    user.diamond += plan.diamonds;
    await user.save();

    const income = new Wallet();
    income.userId = user._id;
    income.diamond = plan.diamonds;
    income.type = 2;
    income.planId = plan._id;
    income.paymentGateway = "Google Play";
    income.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    await income.save();

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

//pay stripe api for android
exports.createCustomer = async (req, res) => {
  try {
    if (!req.body.userId || !req.body.planId || !req.body.currency) {
      return res.status(200).json({ status: false, message: "Oops ! Invalid details!" });
    }

    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exists !" });
    }

    function isValidEmail(email) {
      var pattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
      return pattern.test(email);
    }

    let plan;
    if (!req.body.isVip) {
      plan = await CoinPlan.findById(req.body.planId);
    } else {
      plan = await VIPPlan.findById(req.body.planId);
    }
    if (!plan) {
      return res.status(200).json({ status: false, message: "Plan does not Exists !" });
    }

    if (!settingJSON) {
      return res.status(200).json({ status: false, message: "Setting does not Exists !" });
    }

    let email = user?.email;
    let name = user?.name;

    if (!email || !isValidEmail(email)) {
      let fakeEmail = await FakeEmail.aggregate([{ $sample: { size: 1 } }]);
      email = fakeEmail[0]?.email;
    }

    if (!name) {
      let fakeUser = await FakeUser.aggregate([{ $sample: { size: 3 } }]);
      email = fakeUser[0]?.name;
    }

    const stripe = require("stripe")(settingJSON?.stripeSecretKey);
    const customer = await stripe.customers.create({
      email: email,
      name: name,
    });

    const ephemeralKey = await stripe.ephemeralKeys.create({ customer: customer.id }, { apiVersion: "2023-10-16" });
    const amount = req.body.currency === "inr" ? Math.round(plan?.rupee * 100) : Math.round(plan?.dollar * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: req.body.currency,
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return res.status(200).json({
      status: true,
      paymentIntent: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: settingJSON?.stripePublishableKey,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};

//get purchase plan history of user
exports.purchaseHistory = async (req, res) => {
  try {
    let matchQuery = { type: 2 };
    if (req.query.userId) {
      const user = await User.findById(req.query.userId);
      if (!user) return res.status(200).json({ status: false, message: "User does not Exist!!" });

      matchQuery = { userId: user._id, type: 2 };
    }

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

    const history = await Wallet.aggregate([
      {
        $match: matchQuery,
      },
      {
        $addFields: addFieldQuery,
      },
      { $sort: { _id: -1 } },
      {
        $match: dateFilterQuery,
      },
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
          from: "coinplans",
          localField: "planId",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                dollar: 1,
                rupee: 1,
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
          diamond: 1,
          name: "$user.name",
          uniqueId: "$user.uniqueId",
          image: "$user.image",
          username: "$user.username",
          dollar: "$plan.dollar",
          rupee: "$plan.rupee",
          purchaseDate: "$date",
        },
      },
      {
        $facet: {
          history: [
            { $skip: (start - 1) * limit }, // how many records you want to skip
            { $limit: limit },
          ],
          pageInfo: [
            { $group: { _id: null, totalRecord: { $sum: 1 } } }, // get total records count
          ],
        },
      },
    ]);

    return res.status(200).json({
      status: true,
      message: "Success",
      total: history[0].pageInfo.length > 0 ? history[0].pageInfo[0].totalRecord : 0,
      history: history[0].history,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.isTopToggle = async (req, res, next) => {
  try {
    const coinPlan = await CoinPlan.findById(req.query.planId);
    if (!coinPlan) {
      return res.status(200).json({ status: false, message: "CoinPlan not found" });
    }

    coinPlan.isTop = !coinPlan.isTop;

    const topPlan = await CoinPlan.find({
      isTop: true,
      isDelete: false,
      _id: { $ne: coinPlan._id },
    });

    if (topPlan.length > 0 && coinPlan.isTop) {
      return res.status(200).json({
        status: false,
        message: "overflow ! only one coinPlan allowed in Top coinPlan.",
      });
    }

    await coinPlan.save();

    return res.status(200).json({ status: true, message: "success", data: coinPlan });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "server error" });
  }
};
