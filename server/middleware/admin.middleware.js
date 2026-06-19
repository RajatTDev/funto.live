const Admin = require("../admin/admin.model");
const jwt = require("jsonwebtoken");
const config = require("../../config");
const SubAdmin = require("../subAdmin/subAdmin.model");

module.exports = async (req, res, next) => {
  try {
    const Authorization = req.get("Authorization");
    if (!Authorization) {
      return res.status(401).json({ status: false, message: "You are not Authorized" });
    }

    const decodeToken = await jwt.verify(Authorization, config.JWT_SECRET);

    if (!decodeToken) {
      return res.status(401).json({ status: false, message: "You are not Authorized" });
    }

    if (decodeToken.type === "admin") {
      const admin = await Admin.findById(decodeToken._id);
      req.admin = admin;
    } else if (decodeToken.type === "subAdmin") {
      const subAdmin = await SubAdmin.findById(decodeToken._id).populate("role");
      req.subAdmin = subAdmin;
    }
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, error });
  }
};
