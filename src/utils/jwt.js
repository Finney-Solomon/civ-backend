// src/utils/jwt.js
const jwt = require("jsonwebtoken");
const config = require("../config");

function assertJwtSecret() {
  if (!config.jwt.secret) {
    throw new Error("JWT secret missing. Set JWT_SECRET in your .env");
  }
}

/* ======================
   TOKEN GENERATORS
====================== */
const generateAccessToken = (payload) => {
  assertJwtSecret();
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiry, // e.g. 15m
  });
};

const generateRefreshToken = (payload) => {
  assertJwtSecret();
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiry, // e.g. 7d
  });
};

/* ======================
   TOKEN VERIFIERS
====================== */
const verifyAccessToken = (token) => {
  assertJwtSecret();
  return jwt.verify(token, config.jwt.secret);
};

const verifyRefreshToken = (token) => {
  assertJwtSecret();
  return jwt.verify(token, config.jwt.secret);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
