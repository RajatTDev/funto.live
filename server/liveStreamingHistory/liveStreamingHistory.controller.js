const LiveStreamingHistory = require("./liveStreamingHistory.model");
const User = require("../user/user.model");
const LiveUser = require("../liveUser/liveUser.model");

const moment = require("moment");

// get streaming summary
exports.getStreamingSummary = async (req, res) => {
  try {
    const liveStreamingHistory = await LiveStreamingHistory.findById(req.query.liveStreamingId);
    if (!liveStreamingHistory) return res.status(200).json({ status: false, message: "Live Streaming Id not Found!!" });

    const user = await User.findById(liveStreamingHistory.userId);
    if (!user) {
      return res.status(200).json({ status: false, message: "User does not Exist!" });
    }

    user.isBusy = false;
    await user.save();

    if (liveStreamingHistory.duration == "NaN:NaN:NaN" || liveStreamingHistory.duration == "00:00:00") {
      liveStreamingHistory.endTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
      liveStreamingHistory.momentEndTime = moment(new Date()).format("HH:mm:ss");
      var date1 = moment(liveStreamingHistory.momentStartTime, "HH:mm:ss");
      var date2 = moment(liveStreamingHistory.momentEndTime, "HH:mm:ss");
      var timeDifference = date2.diff(date1);

      var duration = moment.duration(timeDifference);
      var durationTime = moment.utc(duration.asMilliseconds()).format("HH:mm:ss");

      liveStreamingHistory.duration = durationTime == "Invalid date" ? "00:00:00" : durationTime;
      await liveStreamingHistory.save();
    }

    return res.status(200).json({
      status: true,
      message: "Success",
      liveStreamingHistory,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Internal Server Error" });
  }
};
