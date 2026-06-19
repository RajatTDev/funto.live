const Svga = require("./svga.model");
const User = require("../user/user.model");
const Frame = require("../avatarFrame/avatarFrame.model");
const Wallet = require("../wallet/wallet.model");
const Purchase = require("../purchase/purchase.model");
const LiveUser = require("../liveUser/liveUser.model");

const moment = require("moment");

const fs = require("fs");
const { deleteFiles, deleteFile } = require("../../util/deleteFile");

// get all svga
exports.index = async (req, res) => {
  try {
    let data, type;

    if (req.query.type == "svga") {
      data = await Svga.find({ isDelete: false }).sort({ createdAt: -1 });
      type = "svga";
    } else {
      data = await Frame.find({ isDelete: false }).sort({ createdAt: -1 });
      type = "frame";
    }
    data = data.map((item) => ({
      ...item.toObject(),
      type: type,
    }));
    return res.status(200).json({
      status: true,
      message: "Success!!",
      data,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get all svga for android
exports.get = async (req, res) => {
  try {
    const user = await User.findById(req?.query?.userId);
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not found !!" });
    }
    let purchase,
      Model,
      query = { isSelected: false };
    if (req.query.type == "svga") {
      purchase = await Purchase.findOne({
        userId: req.query.userId,
      }).distinct("svga");
      Model = Svga;
      if (user?.liveJoinSvga) {
        query = user.liveJoinSvga;
      }
    } else {
      purchase = await Purchase.findOne({
        userId: req.query.userId,
      }).distinct("frame");
      Model = Frame;
      if (user?.avatarFrame) {
        query = user.avatarFrame;
      }
    }
    const data = await Model.aggregate([
      { $match: { isDelete: false } },
      { $addFields: { type: req.query.type } },
      {
        $addFields: {
          isPurchase: {
            $cond: {
              if: user.isVIP,
              then: true,
              else: {
                $cond: {
                  if: { $in: ["$_id", purchase] },
                  then: true,
                  else: false,
                },
              },
            },
          },
        },
      },

      {
        $addFields: {
          isSelected: {
            $cond: [{ $eq: ["$_id", query] }, true, false],
          },
        },
      },
      { $skip: req.query.start ? parseInt(req.query.start) : 0 },
      { $limit: req.query.limit ? parseInt(req.query.limit) : 20 },
    ]);
    return res.status(200).json({ status: true, message: "Success!!", data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//store svga
exports.store = async (req, res) => {
  try {
    if (!req.body.diamond || !req.files) {
      if (req.files) {
        if (req.files?.imageVideo && fs.existsSync(req.files?.imageVideo[0]?.path)) {
          fs.unlinkSync(req.files?.imageVideo[0]?.path);
        }
        if (req.files?.thumbnail && fs.existsSync(req.files?.thumbnail[0]?.path)) {
          fs.unlinkSync(req.files?.thumbnail[0]?.path);
        }
      }
      return res.status(200).json({ status: false, message: "Invalid Details!" });
    }
    let dataObj = {
      image: req.files?.imageVideo[0]?.path,
      thumbnail: req.files?.thumbnail && req.files?.thumbnail[0]?.path,
      diamond: req.body?.diamond,
      name: req.body?.name,
      validity: req.body?.validity,
      validityType: req.body?.validityType,
      validationTag: `${req.body?.validity} ${req.body?.validityType}`,
    };

    let data = await new Svga(dataObj).save();

    return res.status(200).json({
      status: true,
      message: "Success!",
      data: { ...data._doc, type: "svga" },
    });
  } catch (error) {
    console.log(error);
    if (req.files) {
      if (req.files?.imageVideo && fs.existsSync(req.files?.imageVideo[0]?.path)) {
        fs.unlinkSync(req.files?.imageVideo[0]?.path);
      }
      if (req.files?.thumbnail && fs.existsSync(req.files?.thumbnail[0]?.path)) {
        fs.unlinkSync(req.files?.thumbnail[0]?.path);
      }
    }
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//store multiple svga
exports.frameStore = async (req, res) => {
  try {
    if (!req.body.diamond || !req.files) {
      if (req.files) {
        deleteFiles(req.files);
      }
      return res.status(200).json({ status: false, message: "Invalid Details!" });
    }

    let array = req.files.map((frame) => ({
      image: frame.path,
      diamond: req.body?.diamond,
      name: req.body?.name,
      validity: req.body?.validity,
      validityType: req.body?.validityType,
      validationTag: `${req.body?.validity} ${req.body?.validityType}`,
    }));

    let data = await Frame.insertMany(array);
    data = data.map((item) => ({
      ...item.toObject(),
      type: "frame",
    }));

    return res.status(200).json({ status: true, message: "Success!", data });
  } catch (error) {
    if (req.files) {
      deleteFiles(req.files);
    }
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// update svga
exports.update = async (req, res) => {
  try {
    let Model, message;
    if (req.query?.type == "svga") {
      Model = Svga;
      message = "Svga";
    } else {
      Model = Frame;
      message = "Frame";
    }

    const model = await Model.findById(req.params.Id);
    if (!model) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: `${message} does not Exist!` });
    }

    if (req.files?.thumbnail) {
      if (fs.existsSync(model?.thumbnail)) {
        fs.unlinkSync(model?.thumbnail);
      }
      model.thumbnail = req.files?.thumbnail[0]?.path;
    }

    if (req.files && req.files?.imageVideo) {
      if (fs.existsSync(model.image)) {
        fs.unlinkSync(model.image);
      }

      model.image = req.files?.imageVideo[0]?.path;

      if (req.query?.type !== "svga") {
        await User.updateMany(
          { avatarFrame: model._id },
          {
            avatarFrameImage: model?.image,
          }
        );
      }
    }

    model.diamond = req.body.diamond ? req.body.diamond : model.diamond;
    model.name = req.body.name ? req.body.name : model.name;
    model.validity = req.body.validity ? req.body.validity : model.validity;
    model.validityType = req.body.validityType ? req.body.validityType : model.validityType;
    if (req.body.validity || req.body.validityType) {
      model.validationTag = `${req.body?.validity} ${req.body?.validityType}`;
    }

    await model.save();

    return res.status(200).json({ status: true, message: "Success!", data: model });
  } catch (error) {
    console.log(error);
    if (req.files) {
      if (req.files?.imageVideo && fs.existsSync(req.files?.imageVideo[0]?.path)) {
        fs.unlinkSync(req.files?.imageVideo[0]?.path);
      }
      if (req.files?.thumbnail && fs.existsSync(req.files?.thumbnail[0]?.path)) {
        fs.unlinkSync(req.files?.thumbnail[0]?.path);
      }
    }
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// delete svga
exports.destroy = async (req, res) => {
  try {
    let Model, type, model, query1, query2, query3, query4;
    if (req.query.type == "svga") {
      console.log("svga :");
      Model = Svga;
      type = "svga";
      model = await Model.findById(req.params.Id);
      query1 = { svga: model?._id };
      query2 = { $pull: { svga: { $in: [model?._id] } } };
      query3 = { liveJoinSvga: model?._id };
      query4 = { liveJoinSvga: null };
    } else {
      Model = Frame;
      type = "frame";
      model = await Model.findById(req.params.Id);
      query1 = { frame: model?._id };
      query2 = { $pull: { frame: { $in: [model?._id] } } };
      query3 = { avatarFrame: model?._id };
      query4 = { avatarFrame: null, avatarFrameImage: "" };
    }
    if (!model) return res.status(200).json({ status: false, message: `${type} does not Exist!` });

    if (fs.existsSync(model.image)) {
      fs.unlinkSync(model.image);
    }
    if (fs.existsSync(model?.thumbnail)) {
      fs.unlinkSync(model.thumbnail);
    }
    Purchase.updateMany(query1, query2);
    User.updateMany(query3, query4, (err, result) => {
      if (err) {
        console.error("error: ", err);
      } else {
        console.log(`Removed frame .`, result);
      }
    });
    model.isDelete = true;
    await model.save();

    return res.status(200).json({ status: true, message: "Success !!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// purchase the svga
exports.purchase = async (req, res) => {
  try {
    let type, model, query, purchase;

    if (!req.body.userId || !req.body.Id) {
      return res.send({
        status: false,
        message: "OOps ! Invalid details.",
      });
    }

    const user = await User.findById(req.body.userId).populate("level liveJoinSvga avatarFrame");
    if (!user) {
      return res.send({
        status: false,
        message: "User does not found.",
      });
    }

    if (req.query.type == "svga") {
      type = "svga";
      model = await Svga.findById(req.body.Id);
      if (!model) {
        return res.send({
          status: false,
          message: `svga does not exist!!`,
        });
      }

      query = {
        userId: req.body.userId,
        svga: model._id,
      };
    } else {
      type = "frame";
      model = await Frame.findById(req.body.Id);
      if (!model) {
        return res.send({
          status: false,
          message: `${type} does not exist!!`,
        });
      }

      query = {
        userId: req.body.userId,
        frame: model._id,
      };
    }

    purchase = await Purchase.findOne(query);
    if (purchase) {
      return res.send({
        status: false,
        message: `already purchased for ${type}`,
      });
    }

    if (user.diamond < model.diamond) {
      return res.send({
        status: false,
        message: "Your diamond is not enough!!",
      });
    }

    const validDate = moment().add(model?.validity, `${model?.validityType}`);

    purchase = new Purchase();
    purchase.userId = req.body.userId;
    purchase.frame = type == "frame" ? model?._id : null;
    purchase.svga = type == "svga" ? model._id : null;
    purchase.time = validDate.toISOString();
    await purchase.save();

    user.diamond -= model.diamond;
    user.spentCoin += model.diamond;

    const wallet = new Wallet();
    wallet.userId = user._id;
    wallet.diamond = model.diamond;
    wallet.isIncome = false;
    wallet.date = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

    if (req.query.type == "svga") {
      wallet.svgaId = model._id;
      wallet.type = 9;
    } else {
      wallet.avatarFrameId = model._id;
      wallet.type = 11;
    }

    await Promise.all([user.save(), purchase.save(), wallet.save()]);

    return res.send({
      status: true,
      message: "Success",
      user,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// select svga or frame in user
exports.select = async (req, res) => {
  try {
    console.log("body ===============", req.body);

    let user = await User.findById(req.body?.userId);
    if (!user) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "User does not found!" });
    }

    let model, type, purchase, selectType;
    selectType = req.body.selectType || false;

    if (req.body.type == "svga") {
      type = "svga";
      model = await Svga.findById(req?.body?.Id);
      if (!model) {
        deleteFile(req.file);
        return res.status(200).json({ status: false, message: `Svga does not found!` });
      }

      if (user.isVIP) {
        if (selectType === true) {
          user.liveJoinSvga = model._id;
          await user.save();
        } else if (selectType === false) {
          user.liveJoinSvga = null;
          await user.save();
        }
      } else {
        purchase = await Purchase.findOne({ userId: req.body?.userId, svga: model._id });
        if (purchase) {
          if (selectType === true) {
            user.liveJoinSvga = model._id;
            await user.save();
          } else if (selectType === false) {
            user.liveJoinSvga = null;
            await user.save();
          }
        } else {
          return res.status(200).json({
            status: false,
            message: `First purchase the svga frame!`,
          });
        }
      }
    } else {
      type = "frame";
      model = await Frame.findById(req.body?.Id);
      if (!model) {
        deleteFile(req.file);
        return res.status(200).json({ status: false, message: `Frame does not Exist!` });
      }

      if (user.isVIP) {
        if (selectType === true) {
          user.avatarFrame = model._id;
          user.avatarFrameImage = model.image;
          await user.save();
        } else if (selectType === false) {
          user.avatarFrame = null;
          user.avatarFrameImage = "";
          await user.save();
        }
      } else {
        purchase = await Purchase.findOne({ userId: req.body?.userId, frame: model._id });
        if (purchase) {
          if (selectType === true) {
            user.avatarFrame = model._id;
            user.avatarFrameImage = model.image;
            await user.save();
          } else if (selectType === false) {
            user.avatarFrame = null;
            user.avatarFrameImage = "";
            await user.save();
          }
        } else {
          deleteFile(req.file);
          return res.status(200).json({
            status: false,
            message: `First purchase the frame!`,
          });
        }
      }
    }

    user = await User.findById(req.body?.userId).populate("level liveJoinSvga avatarFrame");

    res.status(200).json({ status: true, message: "Success", user });

    const liveUser = await LiveUser.findOne({ liveUserId: user._id, audio: true });
    if (liveUser) {
      liveUser.avatarFrameImage = user?.avatarFrameImage;
      await liveUser.save();
    }
  } catch (error) {
    console.log(error);
    deleteFile(req.file);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
