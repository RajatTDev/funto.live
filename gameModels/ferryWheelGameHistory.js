const mongoose = require("mongoose");

const FerryWheelGameHistorySchema = new mongoose.Schema(
  {
    frameCoin: {
      type: Array,
      default: 0,
    },
    date: {
      type: String,
      default: "",
    },
    userBits: [
      {
        userId: String,
        SelectedFrame: Number,
        Bit: Number,
        createdAt: {
          type: String,
          default: new Date().toLocaleString("en-US", {
            timeZone: "Asia/Kolkata",
          }),
        },
      },
    ],
    winnerObj: {},
    winnerNumberTimes: { type: Number, default: 1 },
    updatedAdminCoin: { type: Number, default: 0 },
    winnerCoinMinus: { type: Number, default: 0 },
    winnerNumber: Number,
    totalAdd: { type: Number, default: 0 },
  },

  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model(
  "FerryWheelGameHistory",
  FerryWheelGameHistorySchema
);
