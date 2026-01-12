module.exports = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5004", 10),

  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/christ_is_victor",
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  jwt: {
    // ✅ DO NOT silently fallback in prod
    secret:
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-me"),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
  },

  cors: {
    origins: (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(","),
  },

  upload: {
    dir: process.env.UPLOAD_DIR || "./uploads",
    maxSize: parseInt(process.env.MAX_FILE_SIZE || "10485760", 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100", 10),
  },
};
