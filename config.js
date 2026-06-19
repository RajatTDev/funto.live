require("dotenv").config();

module.exports = {
  // Server
  PORT: process.env.PORT || 5000,

  // MongoDB
  MongoDb_Connection_String: process.env.MONGO_URI,

  // Base URL for serving uploaded files (must end with /)
  baseURL: process.env.BASE_URL,

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
};
