const Advertisement = require("./advertisement.model");
const Setting = require("../setting/setting.model");

exports.store = async (req, res) => {
  try {
    if (!req.body) return res.status(200).json({ status: false, message: "Invalid Details" });

    const google = new Advertisement();
    google.native = req.body.native;
    google.reward = req.body.reward;
    google.interstitial = req.body.interstitial;
    google.banner = req.body.banner;
    await google.save();

    return res.status(200).json({
      status: true,
      message: "success",
      advertisement: google,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.update = async (req, res) => {
  try {
    const [google, setting] = await Promise.all([Advertisement.findById(req.params.adId), Setting.findById(req.body.settingId)]);

    if (!google)
      return res.status(200).json({
        status: false,
        message: "Advertisement does not Exist!",
      });

    if (!setting) return res.status(200).json({ status: false, message: "Setting data does not Exist!" });

    google.native = req?.body?.native;
    google.reward = req?.body?.reward;
    google.interstitial = req?.body?.interstitial;
    google.banner = req?.body?.banner;
    await google.save();

    res.status(200).json({ status: true, message: "success", advertisement: google });

    setting.freeDiamondForAd = req?.body?.freeDiamondForAd;
    setting.maxAdPerDay = req?.body?.maxAdPerDay;
    await setting.save();

    updateSettingFile(setting);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

exports.showToggle = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.adId);
    if (!advertisement) {
      return res.status(200).send({
        status: false,
        message: "Advertisement does not Exist!",
      });
    }

    advertisement.show = !advertisement.show;
    await advertisement.save();

    return res.status(200).json({ status: true, message: "success", advertisement });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

//for android and backend
exports.googleAd = async (req, res) => {
  try {
    const ad = await Advertisement.findOne().lean();
    if (!ad) {
      return res.status(200).json({ status: false, message: "Data not Found!" });
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      advertisement: ad,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
