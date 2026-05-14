module.exports = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5004", 10),

  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/christ_is_victor",
    options: {
      maxPoolSize: 50, // Increased for serverless concurrency spikes
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

  redis: {
    enabled: process.env.USE_REDIS === "true",
    uri: process.env.REDIS_URI || "",
  },

  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    region: process.env.AWS_REGION || "us-east-1",
    bucketName: process.env.AWS_S3_BUCKET_NAME || "",
  },

  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || "",
    // Default voice: "Rachel" — calm, clear, professional English
    voiceId: process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM",
    // Recommended model: eleven_multilingual_v2 (best quality)
    modelId: process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
  },
};
