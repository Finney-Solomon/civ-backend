const mongoose = require("mongoose");
const config = require("./index");
const logger = require("../utils/logger");

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return mongoose.connection;

  try {
    const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    isConnected = true;

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      logger.error({ err }, "MongoDB connection error");
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
      isConnected = false;
    });

    return conn;
  } catch (error) {
    logger.error({ error }, "Error connecting to MongoDB");
    // ✅ no process.exit in dev/serverless
    throw error;
  }
};

module.exports = connectDB;
