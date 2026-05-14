const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");

const config = require("./config");
const connectDB = require("./config/database");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const redisClient = require("./config/redis");

const authRoutes = require("./routes/auth.routes");
const brandRoutes = require("./routes/brand.routes");
const templateRoutes = require("./routes/template.routes");
const editionRoutes = require("./routes/edition.routes");
const sectionRoutes = require("./routes/section.routes");
const allocationRoutes = require("./routes/allocation.routes");
const readerRoutes = require("./routes/reader.routes");
const mobileRoutes = require("./routes/mobile.routes");
const meetingRoutes = require("./routes/meeting.routes");
const homeContentRoutes = require("./routes/homeContent.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const paymentRoutes = require("./routes/payment.routes");
const adminUsersRoutes = require("./routes/admin.users.routes");
const uploadRoutes = require("./routes/upload.routes");

const app = express();

logger.info(`JWT_SECRET loaded? ${!!process.env.JWT_SECRET}`);

// DB connect
connectDB().catch((err) => {
  logger.error({ err }, "Mongo connection failed");
});

app.use(helmet());

// ✅ CORS
const allowedOrigins = [
  "https://civ-admin.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173",
];

const corsOptions = {
  origin: function (origin, callback) {
    // allow server-side / curl / postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error("CORS not allowed for origin: " + origin));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// ✅ IMPORTANT: preflight must use SAME options
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(mongoSanitize());

if (config.env === "development") app.use(morgan("dev"));

const rateLimitStore = redisClient
  ? new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    })
  : undefined;

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 20,
  message: "Too many authentication attempts, please try again later",
  store: rateLimitStore,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: "Too many requests from this IP, please try again later",
  store: rateLimitStore,
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: config.env,
  });
});

app.use("/apiLimiter", apiLimiter);
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/admin", adminUsersRoutes);
app.use("/api/v1/brands", brandRoutes);
app.use("/api/v1/templates", templateRoutes);
app.use("/api/v1/editions", editionRoutes);
app.use("/api/v1/sections", sectionRoutes);
app.use("/api/v1/admin/meetings", meetingRoutes);
app.use("/api/v1/admin/home-content", homeContentRoutes);
app.use("/api/v1/allocations", allocationRoutes);
app.use("/api/v1/reader", readerRoutes);
app.use("/api/v1/mobile", mobileRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/upload", uploadRoutes);

app.use((req, res) =>
  res.status(404).json({ success: false, message: "Route not found" })
);

app.use(errorHandler);

module.exports = app;
