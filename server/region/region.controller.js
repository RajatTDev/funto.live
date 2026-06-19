const mongoose = require("mongoose");
const Region = require("./region.model");
const BD = require("../bd/bd.model");

//create region
exports.store = async (req, res) => {
    try {
        if (!req.body.name) {
            return res.status(200).json({ status: false, message: "Region name is required." });
        }

        const existingRegion = await Region.exists({
            name: { $regex: new RegExp(`^${req.body.name.trim()}$`, "i") },
        });

        if (existingRegion) {
            return res.status(200).json({ status: false, message: "Region already exists with that name." });
        }

        const region = new Region();
        region.name = req.body.name.toLowerCase().trim();
        await region.save();

        return res.status(200).json({ status: true, message: "Region created successfully.", data: region });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, error: error.message || "Internal server error" });
    }
};

//update region
exports.update = async (req, res) => {
    try {
        if (!req.body.regionId) {
            return res.status(200).json({ status: false, message: "Region Id is required." });
        }

        if (!mongoose.Types.ObjectId.isValid(req.body.regionId)) {
            return res.status(200).json({ status: false, message: "Region Id is invalid." });
        }

        const region = await Region.findById(req.body.regionId);
        if (!region) {
            return res.status(200).json({ status: false, message: "Region not found." });
        }

        if (req.body.name) {
            const existingRegion = await Region.exists({
                _id: { $ne: region._id },
                name: { $regex: new RegExp(`^${req.body.name.trim()}$`, "i") },
            });

            if (existingRegion) {
                return res.status(200).json({ status: false, message: "Region already exists with that name." });
            }

            region.name = req.body.name.trim();
        }

        await region.save();

        return res.status(200).json({ status: true, message: "Region updated successfully.", data: region });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, error: error.message || "Internal server error" });
    }
};

//active or not region
exports.activeOrNot = async (req, res) => {
    try {
        if (!req.query.regionId) {
            return res.status(200).json({ status: false, message: "Region Id is required." });
        }

        if (!mongoose.Types.ObjectId.isValid(req.query.regionId)) {
            return res.status(200).json({ status: false, message: "Region Id is invalid." });
        }

        const region = await Region.findById(req.query.regionId);
        if (!region) {
            return res.status(200).json({ status: false, message: "Region not found." });
        }

        region.isActive = !region.isActive;
        await region.save();

        return res.status(200).json({ status: true, message: "Region status changed successfully.", data: region });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, error: error.message || "Internal server error" });
    }
};

//get all regions with pagination and search
exports.index = async (req, res) => {
    try {
        const start = req.query.start ? parseInt(req.query.start) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;

        let matchQuery = {};
        if (req.query?.search?.toLowerCase() != "all") {
            matchQuery = {
                name: { $regex: req.query.search, $options: "i" },
            };
        }

        const [total, regions] = await Promise.all([
            Region.countDocuments(matchQuery),
            Region.find(matchQuery)
                .sort({ createdAt: -1 })
                .skip((start - 1) * limit)
                .limit(limit)
        ]);

        return res.status(200).json({ status: true, message: "Region list fetched successfully.", total, data: regions });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, error: error.message || "Internal server error" });
    }
};

//get active regions for dropdown
exports.getActiveRegions = async (req, res) => {
    try {
        let matchQuery = {};
        if (req.query?.search?.toLowerCase() != "all") {
            matchQuery = {
                name: { $regex: req.query?.search || "", $options: "i" },
            };
        }
        const regions = await Region.find({ isActive: true, ...matchQuery }).select("_id name").sort({ createdAt: -1 }).limit(50);

        return res.status(200).json({ status: true, message: "Region list fetched successfully.", data: regions });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, error: error.message || "Internal server error" });
    }
};

//delete region
exports.destroy = async (req, res) => {
    try {
        const { regionId } = req.query;

        if (!regionId) {
            return res.status(200).json({ status: false, message: "Region Id is required." });
        }

        if (!mongoose.Types.ObjectId.isValid(regionId)) {
            return res.status(200).json({ status: false, message: "Region Id is invalid." });
        }

        const objectId = new mongoose.Types.ObjectId(regionId);

        // Remove region reference from BD
        await BD.updateMany(
            { regions: objectId },
            { $pull: { regions: objectId } }
        );

        // Delete region
        const result = await Region.deleteOne({ _id: objectId });

        if (result.deletedCount === 0) {
            return res.status(200).json({ status: false, message: "Region not found." });
        }

        return res.status(200).json({ status: true, message: "Region deleted successfully." });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: false,
            message: error.message || "Internal server error"
        });
    }
};
