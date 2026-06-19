const { default: mongoose } = require("mongoose");
const BDPaymentMethod = require("./bdPaymentMethod.model");

// create bd payment method
exports.addBDPaymentMethod = async (req, res) => {
  try {
    const { name, details } = req.body;

    if (!name.trim() || !details) {
      return res.status(200).json({
        status: false,
        message: "Name and Details are required",
      });
    }

    const methodExists = await BDPaymentMethod.exists({ name: name.trim() });

    if (methodExists) {
      return res.status(200).json({
        status: false,
        message: "This method already exists"
      })
    }

    const newMethod = new BDPaymentMethod({
      name: name.trim(),
      details,
    });

    await newMethod.save();

    return res.status(200).json({
      status: true,
      message: "BD payment method added successfully",
      data: newMethod,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to add BD payment method",
      error: error.message,
    });
  }
};

// update bd payment method
exports.updateBDPaymentMethod = async (req, res) => {
  try {
    const { methodId, name, details } = req.body;

    if (!mongoose.Types.ObjectId.isValid(methodId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid methodId"
      })
    }

    const method = await BDPaymentMethod.findById(methodId);

    if (!method) {
      return res.status(200).json({
        status: false,
        message: "Payment method not found",
      });
    }

    method.name = name.trim() || method.name;
    method.details = details || method.details;

    await method.save();

    return res.status(200).json({
      status: true,
      message: "BD payment method updated successfully",
      data: method,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to update BD payment method",
      error: error.message,
    });
  }
};

// delete bd payment method
exports.deleteBDPaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(methodId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid methodId"
      });
    }

    const deleted = await BDPaymentMethod.findByIdAndDelete(methodId);

    if (!deleted) {
      return res.status(200).json({
        status: false,
        message: "Payment method not found"
      });
    }

    return res.status(200).json({
      status: true,
      message: "BD payment method deleted successfully",
    });

  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to delete BD payment method",
      error: error.message,
    });
  }
};

// get all bd payment methods
exports.getBDPaymentMethods = async (req, res) => {
  try {

    const start = req.query.start ? parseInt(req.query.start) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const [total, methods] = await Promise.all([
      BDPaymentMethod.countDocuments(),
      BDPaymentMethod.find()
        .sort({ createdAt: -1 })
        .skip((start - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    return res.status(200).json({
      status: true,
      message: "BD payment methods retrieved successfully",
      data: methods,
      total
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve BD payment methods",
      error: error.message,
    });
  }
};

// toggle isActive
exports.toggleBDPaymentMethodStatus = async (req, res) => {
  try {
    const { methodId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(methodId)) {
      return res.status(200).json({
        status: false,
        message: "Invalid methodId"
      })
    }

    const method = await BDPaymentMethod.findById(methodId);

    if (!method) {
      return res.status(200).json({
        status: false,
        message: "Payment method not found",
      });
    }

    method.isActive = !method.isActive;
    await method.save();

    return res.status(200).json({
      status: true,
      message: `BD payment method ${method.isActive ? "activated" : "deactivated"
        } successfully`,
      data: method,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to update status",
      error: error.message,
    });
  }
};

// get active bd payment method
exports.fetchBDPaymentMethods = async (req, res) => {
  try {
    const methods = await BDPaymentMethod.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      status: true,
      message: "BD payment methods retrieved successfully",
      data: methods,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve BD payment methods",
      error: error.message,
    });
  }
};