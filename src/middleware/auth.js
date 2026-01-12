// src/middleware/auth.js
const { verifyAccessToken } = require("../utils/jwt");
const { AppUser } = require("../models");
const ApiResponse = require("../utils/apiResponse");

/**
 * Authenticate requests using ACCESS token only.
 * Refresh token is only for /auth/refresh endpoint.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return ApiResponse.unauthorized(res, "No token provided");
    }

    const token = authHeader.slice(7).trim();
    if (!token) return ApiResponse.unauthorized(res, "No token provided");

    // ✅ verify access token (short-lived)
    const decoded = verifyAccessToken(token);

    // ✅ load user and account checks
    const user = await AppUser.findById(decoded.userId).populate("account_id").lean();

    console.log(user,"useruseruseruseruser")

    if (!user || user.status !== "active") {
      return ApiResponse.unauthorized(res, "Invalid or inactive user");
    }

    if (!user.account_id || user.account_id.status !== "active") {
      return ApiResponse.unauthorized(res, "Account is not active");
    }

    req.user = {
      userId: user._id.toString(),
      accountId: user.account_id._id.toString(),
      email: user.email,
      phone: user.phone,
      roles: user.roles || [],
    };

    return next();
  } catch (error) {
    if (error?.name === "TokenExpiredError") {
      return ApiResponse.unauthorized(res, "Token expired");
    }
    if (error?.name === "JsonWebTokenError") {
      return ApiResponse.unauthorized(res, "Invalid token");
    }
    return ApiResponse.error(res, "Authentication failed", 500);
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return ApiResponse.unauthorized(res);

    const userRoles = (req.user.roles || []).map((r) => r.role);
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));

    if (!hasRole) return ApiResponse.forbidden(res, "Insufficient permissions");
    return next();
  };
};

const requireBrandAccess = (req, res, next) => {
  const brandId =
    req.params.brandId || req.body.brand_id || req.query.brandId || req.query.brand_id;

  if (!brandId) return next();
  if (!req.user) return ApiResponse.unauthorized(res);

  const userRoles = req.user.roles || [];
  const isSuperAdmin = userRoles.some((r) => r.role === "SUPER_ADMIN");
  if (isSuperAdmin) return next();

  const hasAccess = userRoles.some((r) => {
    if (r.role === "ADMIN" || r.role === "AUTHOR") {
      return (r.brand_ids || []).some((id) => id.toString() === brandId.toString());
    }
    return false;
  });

  if (!hasAccess) return ApiResponse.forbidden(res, "No access to this brand");
  return next();
};

module.exports = {
  authenticate,
  requireRole,
  requireBrandAccess,
};
