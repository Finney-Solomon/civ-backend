const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");

const config = require("./config");
const connectDB = require("./config/database");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./routes/auth.routes");
const brandRoutes = require("./routes/brand.routes");
const templateRoutes = require("./routes/template.routes");
const editionRoutes = require("./routes/edition.routes");
const sectionRoutes = require("./routes/section.routes");
const allocationRoutes = require("./routes/allocation.routes");
const readerRoutes = require("./routes/reader.routes");
const subscriptionRoutes = require("./routes/subscription.routes");
const paymentRoutes = require("./routes/payment.routes");
const adminUsersRoutes = require("./routes/admin.users.routes");

const app = express();

logger.info(`JWT_SECRET loaded? ${!!process.env.JWT_SECRET}`);

// connect DB (won’t kill process)
connectDB().catch((err) => {
  logger.error({ err }, "Mongo connection failed");
});

app.use(helmet());

const allowedOrigins = [
  "https://civ-admin.vercel.app",   // frontend
  "https://civ-backend.vercel.app", // backend (optional)
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow server-side, curl, postman
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed for origin: " + origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ VERY IMPORTANT — handle preflight
app.options("*", cors());


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(mongoSanitize());

if (config.env === "development") app.use(morgan("dev"));

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 20,
  message: "Too many authentication attempts, please try again later",
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), env: config.env });
});

app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/admin", adminUsersRoutes);
app.use("/api/v1/brands", brandRoutes);
app.use("/api/v1/templates", templateRoutes);
app.use("/api/v1/editions", editionRoutes);
app.use("/api/v1/sections", sectionRoutes);
app.use("/api/v1/allocations", allocationRoutes);
app.use("/api/v1/reader", readerRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/payments", paymentRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));
app.use(errorHandler);

module.exports = app;
