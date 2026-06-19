const GameAdminCoin = require("./gameAdminCoin.model");

//store multiple gift
exports.reset = async (req, res) => {
  try {
    const gameAdminCoin = await GameAdminCoin.findOne({});
    gameAdminCoin.totalCoin += gameAdminCoin.coin;
    gameAdminCoin.coin = 0;
    await gameAdminCoin.save();
    return res.status(200).json({ status: true, message: "Success!", gameAdminCoin });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};
