const multer = require("multer");
const fs = require("fs");

exports.storage = multer.diskStorage({
  filename: (req, file, callback) => {
    const filename = Date.now() + Math.floor(Math.random() * 100) + file.originalname.replace(/ /g, "");
    callback(null, filename);
  },
  destination: (req, file, callback) => {
    if (!fs.existsSync("storage")) {
      fs.mkdirSync("storage");
    }
    callback(null, "storage");
  },
});

exports.svga = multer.diskStorage({
  filename: (req, file, callback) => {
    const filename = Date.now() + Math.floor(Math.random() * 100) + file.originalname.replace(/ /g, "");
    callback(null, filename);
  },
  destination: (req, file, callback) => {
    if (!fs.existsSync("svga")) {
      fs.mkdirSync("svga");
    }
    callback(null, "svga");
  },
});
