const User = require("../user/user.model");
const admin = require("../../util/privateKey");
const config = require("../../config");

// handle user notification true/false
exports.handleNotification = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId).populate(
      "level liveJoinSvga avatarFrame"
    );

    if (!user)
      return res
        .status(200)
        .json({ status: false, message: "User does not Exist!", user: {} });

    if (req.body.type === "newFollow") {
      user.notification.newFollow = !user.notification.newFollow;
    }

    if (req.body.type === "favoriteLive") {
      user.notification.favoriteLive = !user.notification.favoriteLive;
    }

    if (req.body.type === "likeCommentShare") {
      user.notification.likeCommentShare = !user.notification.likeCommentShare;
    }

    if (req.body.type === "message") {
      user.notification.message = !user.notification.message;
    }

    await user.save();

    return res.status(200).json({ status: true, message: "Success!!", user });
  } catch (error) {
    console.log(error);
    return res.status(200).json({
      status: false,
      error: error.message || "Server Error",
      user: "",
    });
  }
};

exports.particularUserNotification = async (req, res) => {
  try {
    console.log("req.body", req.body);
    if (!req.body.userId) {
      return res
        .status(200)
        .send({ status: false, message: "Oops! Invalid details!!" });
    }

    const user = await User.findById(req.body.userId);
    if (!user) {
      return res
        .status(200)
        .send({ status: false, message: "User does not exist" });

    }

    console.log("User FCM Token:", user.fcmToken);
    

    const payload = {
      token: user.fcmToken,
      notification: {
        body: req.body.message,
        title: req.body.title,
        image: req.file ? config.baseURL + req.file.path : "",
      },
    };


    if (user && user.fcmToken) {
      try {
        const adminPromise = await admin;
        const response = await adminPromise.messaging().send(payload);
        console.log("Successfully sent message:", response);
      } catch (error) {
        console.log("Error sending message:", error);
      }
    }
    

    return res.status(200).json({ status: true, message: "Success" });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};


exports.allUserNotification = async (req, res) => {
  try {
    console.log("req.body", req.body);
    const userFCM = await User.find({
      isBlock: false,
    }).distinct("fcmToken");

    const payload = {
      tokens: userFCM,
      notification: {
        title: req.body.title,
        body: req.body.message,
        image: req.file ? config.baseURL + req.file.path : "",
      },
    };

    const adminPromise  = await admin

    adminPromise
      .messaging()
      .sendEachForMulticast(payload)
      .then(async (response) => {
        console.log("Successfully sent with response: ", response);
      })
      .catch((error) => {
        console.log("Error sending message:", error);
      });

    return res.status(200).json({ status: true, message: "Success" });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      status: false,
      message: error.message || "Internal Server Error",
    });
  }
};
