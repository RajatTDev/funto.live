const express = require("express");
const mongoose = require("mongoose");
const app = express();
const path = require("path");
const cors = require("cors");
const fs = require("fs");

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.set("trust proxy", true);

const config = require("./config");

var logger = require("morgan");
app.use(logger("dev"));

//socket io
const http = require("http");
const server = http.createServer(app);
global.io = require("socket.io")(server);

//import model
const Setting = require("./server/setting/setting.model");

//settingJson
const settingJson = require("./setting");

//Declare global variable
global.settingJSON = {};

//handle global.settingJSON when pm2 restart
async function initializeSettings() {
  try {
    const setting = await Setting.findOne().sort({ createdAt: -1 });
    if (setting) {
      console.log("In setting initialize Settings");
      global.settingJSON = setting;
    } else {
      global.settingJSON = settingJson;
    }
  } catch (error) {
    console.error("Failed to initialize settings:", error);
  }
}

module.exports = { initializeSettings };

//Declare the function as a global variable to update the setting.js file
global.updateSettingFile = (settingData) => {
  const settingJSON = JSON.stringify(settingData, null, 2);
  fs.writeFileSync("setting.js", `module.exports = ${settingJSON};`, "utf8");

  global.settingJSON = settingData; // Update global variable
  console.log("Settings file updated.");
};

//mongodb connection
mongoose.connect(config?.MongoDb_Connection_String);

app.use(express.static(path.join(__dirname, "public")));
app.use("/storage", express.static(path.join(__dirname, "storage")));
app.use("/svga", express.static(path.join(__dirname, "svga")));

app.get("/.well-known/assetlinks.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  return res.status(200).json(global?.settingJSON?.androidAssetLinks || []);
});

const Route = require("./route");
app.use("/", Route);

app.get("/*", function (req, res) {
  res.status(200).sendFile(path.join(__dirname, "public", "index.html"));
});

const db = mongoose.connection;
db.on("error", () => {
  console.log("error............");
});

db.once("open", async () => {
  console.log("MONGO: successfully connected to db....");

  await initializeSettings();

  server.listen(config.PORT, () => {
    console.log("Magic happens on port: " + config.PORT);
  });

  require("./socket");
});

//node-cron
const cron = require("node-cron");

//import model
const User = require("./server/user/user.model");

//Schedule a task to update user's daily watch Ads
cron.schedule("0 0 * * *", async () => {
  await User.updateMany(
    {
      "ad.count": { $gt: 0 },
      "ad.date": { $ne: null },
    },
    {
      $set: {
        "ad.count": 0,
        "ad.date": null,
      },
    },
  );
});
