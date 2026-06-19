const mongoose = require("mongoose");

const searchHistorySchema = new mongoose.Schema(
  {
    searchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    searchedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    searchText: {
      type: String,
      required: true,
      trim: true,
    },

    searchCount:{
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true, 
    versionKey: false,
  }
);

// Optional but useful
searchHistorySchema.index({ searchedBy: 1, createdAt: -1 });
searchHistorySchema.index({ searchedUser: 1});
searchHistorySchema.index({ searchText: 1});

module.exports = mongoose.model("SearchHistory", searchHistorySchema);
