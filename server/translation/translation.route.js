const express = require("express");

const localizationController = require("./translation.controller");
const checkAccessWithSecretKey = require("../../checkAccess");

const router = express.Router();
const multer = require("multer");
const { storage } = require("../../util/multer");
const upload = multer({ storage });

router.use(checkAccessWithSecretKey());

const { checkPermission, MODULES } = require("../middleware/checkPermission.middleware");
const AdminMiddleware = require("../middleware/admin.middleware");

// create Translations for languages using CSV file
router.post(
  "/uploadTranslations",
  AdminMiddleware,
  checkPermission(MODULES.LANGUAGE),
  upload.single("file"),
  localizationController.uploadTranslations
);

// Update specific key-value pairs for a language
router.patch("/updateLanguageTranslations", AdminMiddleware, checkPermission(MODULES.LANGUAGE), localizationController.updateLanguageTranslations);

// download all translations as CSV file
router.get("/downloadTranslationsCSV", AdminMiddleware, checkPermission(MODULES.LANGUAGE), localizationController.downloadTranslationsCSV);

// get single Language's translations
router.get("/getSingleLanguage", AdminMiddleware, checkPermission(MODULES.LANGUAGE), localizationController.getSingleLanguage);

// get single Language's translations (client)
router.get("/getLanguageTranslations", localizationController.getLanguage);

// get all Languages and their translations (client)
router.get("/getAllLanguagesTranslation", localizationController.getAllLanguages);

// get latest version of global Language system (client)
router.get("/version/latest", localizationController.getLatestVersion);

// get all active Languages (client)
router.get("/getActiveLanguage", localizationController.getActiveLanguage);


module.exports = router;