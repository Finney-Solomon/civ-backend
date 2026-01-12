// src/middleware/errorHandler.js
const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) return next(err);

  // ---- normalize some common fields ----
  const statusCode = Number(err.statusCode || err.status || 500);
  const name = err.name || "Error";
  const code = err.code;
  const message = err.message || "Internal server error";

  // ---- log rich error context (helps you fix fast) ----
  logger.error({
    message,
    name,
    code,
    statusCode,
    url: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId,
    // log request ids if you have any middleware for that
    stack: err.stack,
    // helpful for debugging auth/body issues (keep small)
    query: req.query,
    params: req.params,
  });

  // ---- mongoose validation ----
  if (name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: Object.values(err.errors || {}).map((e) => e.message),
    });
  }

  // ---- mongoose cast error ----
  if (name === "CastError") {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  // ---- duplicate key error ----
  if (code === 11000) {
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : "field";
    return res.status(409).json({
      success: false,
      message: `Duplicate value for field: ${field}`,
    });
  }

  // ---- JWT errors (important for your case) ----
  if (name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
  if (name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Token expired" });
  }

  // ---- default ----
  return res.status(statusCode).json({
    success: false,
    message,
    // show stack only in development (super useful)
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};

module.exports = errorHandler;
