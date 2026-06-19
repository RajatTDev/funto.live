const { baseURL } = require("../../config");
const { deleteFiles, deleteFile } = require("../../util/deleteFile");
const Theme = require("./theme.model");
const fs = require("fs");

// get theme list
exports.index = async (req, res) => {
  try {
    const theme = await Theme.aggregate([
      { $match: { _id: { $ne: null } } },
      {
        $project: {
          theme: 1,
          type: 1,
          isDefault: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]).sort({ createdAt: -1 });

    if (!theme) return res.status(200).json({ status: false, message: "No data found!" });

    return res.status(200).json({ status: true, message: "Success!!", theme });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// store multiple theme
exports.store = async (req, res) => {
  try {
    if (!req.files) return res.status(200).json({ status: false, message: "Invalid Details!" });

    const theme = req.files.map((theme) => ({
      theme: theme.path,
    }));

    const themes = await Theme.insertMany(theme);

    return res.status(200).json({ status: true, message: "Success!", theme: themes });
  } catch (error) {
    console.log(error);
    deleteFiles(req.files);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// update theme
exports.update = async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.themeId);

    if (!theme) {
      deleteFile(req.file);
      return res.status(200).json({ status: false, message: "theme does not Exist!" });
    }

    if (req.file) {
      if (fs.existsSync(theme.theme)) {
        fs.unlinkSync(theme.theme);
      }
      theme.theme = req.file.path;
    }

    await theme.save();

    // const theme_ = { ...theme, theme: baseURL + theme };

    return res.status(200).json({ status: true, message: "Success!", theme: theme });
  } catch (error) {
    console.log(error);
    deleteFile(req.file);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// delete theme
exports.destroy = async (req, res) => {
  try {
    const theme = await Theme.findById(req.params.themeId);

    if (!theme) return res.status(200).json({ status: false, message: "theme does not Exist!" });

    if (fs.existsSync(theme.theme)) {
      fs.unlinkSync(theme.theme);
    }

    await theme.deleteOne();

    return res.status(200).json({ status: true, message: "Success!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error: error.message || "Server Error" });
  }
};

// set a theme as the default
exports.setDefaultTheme = async (req, res) => {
  try {
    const theme = await Theme.findById(req.query.themeId);

    if (!theme) {
      return res.status(200).json({
        status: false,
        message: "Theme not found. Please provide a valid theme ID.",
      });
    }

    await Theme.updateMany({ _id: { $ne: theme._id } }, { $set: { isDefault: false } });

    theme.isDefault = true;
    await theme.save();

    return res.status(200).json({
      status: true,
      message: `Theme '${theme.name}' has been set as default.`,
      theme,
    });
  } catch (error) {
    console.error("Error in setDefaultTheme:", error);
    return res.status(500).json({
      status: false,
      message: "An unexpected error occurred while setting the default theme.",
      error: error.message,
    });
  }
};
