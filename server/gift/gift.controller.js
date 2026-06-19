const Gift = require("./gift.model");
const Category = require("../giftCategory/giftCategory.model");
const fs = require("fs");
const { deleteFiles, deleteFile } = require("../../util/deleteFile");
const mongoose = require("mongoose");

// get all gift
exports.index = async (req, res) => {
  try {
    const gift = await Category.aggregate([
      {
        $lookup: {
          from: "gifts",
          localField: "_id",
          foreignField: "category",
          as: "gift",
        },
      },
    ]);

    return res.status(200).json({ status: true, message: "Success!!", gift });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// get category wise gifts
exports.categoryWiseGift = async (req, res) => {
  try {
    const [category, gift] = await Promise.all([
      Category.findById(req.params?.categoryId),
      Gift.aggregate([
        {
          $match: {
            category: {
              $eq: new mongoose.Types.ObjectId(req.params?.categoryId),
            },
          },
        },
        {
          $addFields: { count: 0 },
        },
        { $sort: { createdAt: -1 } },
      ]),
    ]);

    if (!category) return res.status(200).json({ status: false, message: "Category does not Exist!" });

    if (!gift) return res.status(200).json({ status: false, message: "No data found!" });

    return res.status(200).json({ status: true, message: "Success!!", gift });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//store multiple gift
exports.store = async (req, res) => {
  try {
    if (!req.body.coin || !req.files || !req.body.category) {
      if (req.files) {
        deleteFiles(req.files);
      }
      return res.status(200).json({ status: false, message: "Invalid Details!" });
    }

    const category = await Category.findById(req.body.category);
    if (!category) return res.status(200).json({ status: false, message: "Category does not Exist!" });

    const gift = req.files.map((gift) => ({
      image: gift.path,
      coin: req.body.coin,
      category: category._id,
      type: gift.mimetype === "image/gif" ? 1 : gift.mimetype === "application/octet-stream" ? 2 : 0,
    }));

    const gifts = await Gift.insertMany(gift);
    const data = await Promise.all(
      gifts.map(async (gift) => {
        const result = await Gift.findById(gift._id).populate("category", "name");
        return result;
      })
    );

    return res.status(200).json({ status: true, message: "Success!", gift: data });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.svgaAdd = async (req, res) => {
  try {
    if (!req.body?.coin || !req.body?.category || !req.files) {
      if (req.files?.image && fs.existsSync(req.files?.image[0]?.path)) {
        fs.unlinkSync(req.files?.image[0]?.path);
      }

      if (req.files?.svgaImage && fs.existsSync(req.files?.svgaImage[0]?.path)) {
        fs.unlinkSync(req.files?.svgaImage[0]?.path);
      }

      return res.status(200).json({ status: false, message: "Invalid Details !!" });
    }

    const category = await Category.findById(req.body?.category);
    if (!category) {
      if (req.files?.image && fs.existsSync(req.files?.image[0]?.path)) {
        fs.unlinkSync(req.files?.image[0]?.path);
      }

      if (req.files?.svgaImage && fs.existsSync(req.files?.svgaImage[0]?.path)) {
        fs.unlinkSync(req.files?.svgaImage[0]?.path);
      }

      return res.status(200).json({ status: false, message: "Category does not Exist!" });
    }

    const gift = await new Gift({
      image: req.files?.image[0]?.path,
      svgaImage: req.files?.svgaImage && req.files?.svgaImage[0]?.path,
      coin: req.body?.coin,
      category: category?._id,
      type: 2,
    }).save();

    return res.status(200).json({ status: true, message: "success", data: gift });
  } catch (error) {
    console.log(error);
    if (req.files?.image && fs.existsSync(req.files?.image[0]?.path)) {
      fs.unlinkSync(req.files?.image[0]?.path);
    }
    if (req.files?.svgaImage && fs.existsSync(req.files?.svgaImage[0]?.path)) {
      fs.unlinkSync(req.files?.svgaImage[0]?.path);
    }
    return res.status(500).json({ status: false, error: error.message || "server error" });
  }
};

// update gift
exports.update = async (req, res) => {
  try {
    const gift = await Gift.findById(req.params.giftId);
    if (!gift) {
      req.files?.image && fs.existsSync(req.files?.image[0]?.path) && fs.unlinkSync(req.files?.image[0]?.path);
      req.files?.svgaImage && fs.existsSync(req.files?.svgaImage[0]?.path) && fs.unlinkSync(req.files?.svgaImage[0]?.path);
      return res.status(200).json({ status: false, message: "Gift does not Exist!" });
    }

    if (req.files && req.files?.svgaImage) {
      if (fs.existsSync(gift.svgaImage)) {
        fs.unlinkSync(gift.svgaImage);
      }

      gift.svgaImage = req.files && req.files.svgaImage && req.files.svgaImage[0]?.path;
    }

    if (req.files && req.files?.image) {
      if (fs.existsSync(gift.image)) {
        fs.unlinkSync(gift.image);
      }

      if (fs.existsSync(gift.svgaImage)) {
        fs.unlinkSync(gift.svgaImage);
      }

      gift.type = req.files?.image[0]?.mimetype === "image/gif" ? 1 : req.files?.image[0]?.mimetype === "application/octet-stream" ? 2 : 0;
      gift.image = req.files && req.files.image && req.files.image[0]?.path;
      gift.svgaImage = req.files && req.files.svgaImage && req.files.svgaImage[0]?.path;
    }

    if (req.files && !req.files?.image && req.files?.svgaImage) {
      if (fs.existsSync(req.files?.svgaImage)) {
        fs.unlinkSync(req.files?.svgaImage);
      }
    }

    gift.coin = req.body?.coin;
    gift.category = req.body.category && req.body?.category;
    await gift.save();

    const data = await Gift.findById(gift._id);

    return res.status(200).json({ status: true, message: "Success!", gift: data });
  } catch (error) {
    console.log(error);
    req.files?.image && fs.existsSync(req.files?.image[0]?.path) && fs.unlinkSync(req.files?.image[0]?.path);
    req.files?.svgaImage && fs.existsSync(req.files?.svgaImage[0]?.path) && fs.unlinkSync(req.files?.svgaImage[0]?.path);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// delete gift
exports.destroy = async (req, res) => {
  try {
    const gift = await Gift.findById(req.params.giftId);
    if (!gift) return res.status(200).json({ status: false, message: "Gift does not Exist!" });

    if (fs.existsSync(gift.image)) {
      fs.unlinkSync(gift.image);
    }

    await gift.deleteOne();

    return res.status(200).json({ status: true, message: "Success!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
