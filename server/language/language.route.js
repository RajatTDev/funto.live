//express
const express = require("express");
const route = express.Router();

const checkAccessWithSecretKey = require("../../checkAccess");
const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

//controller
const languageController = require("./language.controller");

route.use(checkAccessWithSecretKey());

// create Language
route.post("/createLanguage", AdminMiddleware, checkPermission(MODULES.LANGUAGE), upload.single("languageIcon"), languageController.createLanguage);

// get all languages
route.get("/getAllLanguages", AdminMiddleware, checkPermission(MODULES.LANGUAGE), languageController.getAllLanguages);

// get single Lnaguage
route.get("/getLanguage", AdminMiddleware, checkPermission(MODULES.LANGUAGE), languageController.getLanguage);

// update Language
route.patch("/updateLanguage", AdminMiddleware, checkPermission(MODULES.LANGUAGE), upload.single("languageIcon"), languageController.updateLanguage);

// toggle isActive and isDefault switch
route.patch("/toggleSwitch", AdminMiddleware, checkPermission(MODULES.LANGUAGE), languageController.toggleSwitch);

// delete Language and its Translations
route.delete("/deleteLanguage", AdminMiddleware, checkPermission(MODULES.LANGUAGE), languageController.deleteLanguage);

module.exports = route;
