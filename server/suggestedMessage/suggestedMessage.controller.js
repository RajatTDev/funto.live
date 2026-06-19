const SuggestedMessage = require("../suggestedMessage/suggestedMessage.model");

// Add a new suggested message
exports.addSuggestedMessage = async (req, res) => {
  try {
    const { message } = req.query;
    if (!message) {
      return res.status(200).json({ status: false, message: "Message is required" });
    }

    const newMessage = await SuggestedMessage.create({ message });

    return res.status(200).json({
      status: true,
      message: "Suggested message added successfully.",
      data: newMessage,
    });
  } catch (error) {
    console.error("Error adding suggested message:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

// Update Suggested Message
exports.updateSuggestedMessage = async (req, res) => {
  try {
    const { id, message } = req.query;

    if (!message) {
      return res.status(200).json({ status: false, message: "Message is required" });
    }

    const updated = await SuggestedMessage.findByIdAndUpdate(id, { message }, { new: true, runValidators: true });

    if (!updated) {
      return res.status(200).json({ status: false, message: "Message not found" });
    }

    return res.status(200).json({
      status: true,
      message: "Suggested message updated successfully.",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating suggested message:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

// Delete Suggested Message
exports.deleteSuggestedMessage = async (req, res) => {
  try {
    const { id } = req.query;

    const deleted = await SuggestedMessage.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(200).json({ status: false, message: "Message not found" });
    }

    return res.status(200).json({
      status: true,
      message: "Suggested message deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting suggested message:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

// Get All Suggested Messages
exports.getAllSuggestedMessages = async (req, res) => {
  try {
    const messages = await SuggestedMessage.find().lean();

    return res.status(200).json({
      status: true,
      message: "Fetched all suggested messages.",
      data: messages,
    });
  } catch (error) {
    console.error("Error fetching suggested messages:", error);
    return res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};
