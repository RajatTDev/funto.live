const SearchHistory = require("./searchHistory.model");
const User = require("../user/user.model");
const mongoose = require('mongoose')

exports.saveSearchHistory = async (req, res) => {
    try {
        const { searchedBy, searchedUser, searchText } = req.query;

        if (!searchedBy || !searchedUser || !searchText) {
            return res.status(400).json({
                status: false,
                message: "searchedBy, searchedUser, and searchText are required!"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(searchedBy) || !mongoose.Types.ObjectId.isValid(searchedUser)) {
            return res.status(400).json({
                status: false,
                message: "Invalid user ID!"
            });
        }

        if (searchedBy === searchedUser) {
            return res.status(400).json({
                status: false,
                message: "Can't search to self!"
            });
        }

        const trimmedSearchText = searchText.trim();

        if (!trimmedSearchText) {
            return res.status(400).json({
                status: false,
                message: "Search string can't be empty!"
            });
        }

        await SearchHistory.findOneAndUpdate(
            { searchedBy, searchedUser },
            {
                $set: {
                    searchText: trimmedSearchText
                },
                $inc: {
                    searchCount: 1
                }
            },
            {
                upsert: true,
                new: true
            }
        );


        return res.status(201).json({
            status: true,
            message: "Search history saved!"
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        });
    }
};

exports.getSearchHistory = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                status: false,
                message: "userId is required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid userId"
            });
        }

        const start = req.query.start ? parseInt(req.query.start) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 20;

        const [total, history] = await Promise.all([
            SearchHistory.countDocuments(),
            SearchHistory.find({ searchedBy: userId })
                .populate("searchedUser", "name username image uniqueId countryFlagImage ")
                .sort({ updatedAt: -1 })
                .skip((start - 1) * limit)
                .limit(limit)
                .lean()
        ]);

        return res.json({
            status: true,
            data: history,
            total,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: "Internal Server Error" });
    }
};

exports.deleteSearchHistory = async (req, res) => {
    try {
        const userId = String(req.query.userId || "");
        const historyId = req.query.historyId
            ? String(req.query.historyId)
            : null;

        if (!userId) {
            return res.status(400).json({
                status: false,
                message: "userId is required"
            });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid user ID!"
            });
        }

        if (historyId && !mongoose.Types.ObjectId.isValid(historyId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid history ID!"
            });
        }

        let result;

        if (historyId) {
            // delete single
            result = await SearchHistory.deleteOne({
                _id: historyId,
                searchedBy: userId
            });
        } else {
            // delete all
            result = await SearchHistory.deleteMany({
                searchedBy: userId
            });
        }

        if (!result.deletedCount) {
            return res.status(404).json({
                status: false,
                message: "No search history found"
            });
        }

        return res.json({
            status: true,
            message: "Search history deleted successfully"
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({
            status: false,
            message: "Internal Server Error"
        });
    }
};
