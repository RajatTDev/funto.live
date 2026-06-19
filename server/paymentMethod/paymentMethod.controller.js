const PaymentMethod = require("../../server/paymentMethod/paymentMethod.model");

exports.addPaymentMethod = async (req, res) => {
  try {
    const { name } = req.body;

    const newPaymentMethod = new PaymentMethod({
      name,
    });

    await newPaymentMethod.save();
    return res.status(200).json({ status: true, message: "Payment method added successfully", data: newPaymentMethod });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Failed to add payment method", error: error.message });
  }
};

exports.updatePaymentMethod = async (req, res) => {
  try {
    const { id, name } = req.body;

    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      return res.status(200).json({ status: false, message: "Payment method not found" });
    }

    paymentMethod.name = name || paymentMethod.name;
    await paymentMethod.save();

    return res.status(200).json({
      status: true,
      message: `Payment method updated successfully`,
      data: paymentMethod,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to update payment method status",
      error: error.message,
    });
  }
};

exports.deletePaymentMethod = async (req, res) => {
  try {
    const { id } = req.query;
    await PaymentMethod.findByIdAndDelete(id);

    res.status(200).json({ status: true, message: "Payment method deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: false, message: "Failed to delete payment method", error: error.message });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find().select("name isActive").sort({ createdAt: -1 }).lean();

    res.status(200).json({ status: true, message: "Payment methods retrieved successfully", data: methods });
  } catch (error) {
    res.status(500).json({ status: false, message: "Failed to retrieve payment methods", error: error.message });
  }
};

exports.togglePaymentMethodStatus = async (req, res) => {
  try {
    const { id } = req.query;

    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      return res.status(200).json({ status: false, message: "Payment method not found" });
    }

    paymentMethod.isActive = !paymentMethod.isActive;
    await paymentMethod.save();

    return res.status(200).json({
      status: true,
      message: `Payment method ${paymentMethod.isActive ? "activated" : "deactivated"} successfully`,
      data: paymentMethod,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Failed to update payment method status",
      error: error.message,
    });
  }
};

exports.fetchPaymentMethods = async (req, res) => {
  try {
    const methods = await PaymentMethod.find({ isActive: true }).select("name").sort({ createdAt: -1 }).lean();

    res.status(200).json({ status: true, message: "Payment methods retrieved successfully", data: methods });
  } catch (error) {
    res.status(500).json({ status: false, message: "Failed to retrieve payment methods", error: error.message });
  }
};
