const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');
const { AppUser } = require('../models');

class AuthController {
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return ApiResponse.success(res, result, 'Registration successful', 201);
    } catch (error) {
      if (error.message.includes('already registered')) {
        return ApiResponse.error(res, error.message, 409);
      }
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const clientInfo = {
        platform: req.body.platform || 'web',
        device_id: req.body.device_id || '',
        device_name: req.body.device_name || '',
        ip: req.ip,
        user_agent: req.headers['user-agent'] || '',
      };

      const result = await authService.login(req.body, clientInfo);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
      if (error.message.includes('Invalid credentials') || error.message.includes('not active')) {
        return ApiResponse.unauthorized(res, error.message);
      }
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refresh_token } = req.body;
      const tokens = await authService.refreshToken(refresh_token);
      return ApiResponse.success(res, tokens, 'Token refreshed');
    } catch (error) {
      return ApiResponse.unauthorized(res, 'Invalid or expired refresh token');
    }
  }

  async logout(req, res, next) {
    try {
      const { refresh_token } = req.body;
      await authService.logout(req.user.userId, refresh_token);
      return ApiResponse.success(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      const user = await AppUser.findById(req.user.userId)
        .populate('account_id')
        .lean();

      if (!user) {
        return ApiResponse.notFound(res, 'User not found');
      }

      const formattedUser = authService.formatUser(user, user.account_id);
      return ApiResponse.success(res, formattedUser);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
