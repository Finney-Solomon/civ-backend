const authService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    return ApiResponse.success(res, result, 'User registered successfully', 201);
  } catch (error) {
    if (error.message === 'Email or phone already registered') {
      return ApiResponse.error(res, error.message, 400);
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const clientInfo = {
      ip: req.ip,
      user_agent: req.headers['user-agent'],
      platform: req.headers['x-platform'] || 'web',
    };
    const result = await authService.login(req.body, clientInfo);
    return ApiResponse.success(
      res,
      result,
      result.is_new_user ? 'New user' : 'Logged in successfully'
    );
  } catch (error) {
    if (error.message === 'Invalid credentials' || error.message === 'User account is not active') {
      return ApiResponse.unauthorized(res, error.message);
    }
    next(error);
  }
};

const loginWithPassword = async (req, res, next) => {
  try {
    const clientInfo = {
      ip: req.ip,
      user_agent: req.headers['user-agent'],
      platform: req.headers['x-platform'] || 'web',
    };
    const result = await authService.loginWithPassword(req.body, clientInfo);
    return ApiResponse.success(
      res,
      result,
      result.is_new_user ? 'New user' : 'Logged in successfully'
    );
  } catch (error) {
    if (error.message === 'Invalid credentials' || error.message === 'User account is not active') {
      return ApiResponse.unauthorized(res, error.message);
    }
    next(error);
  }
};

const requestOtp = async (req, res, next) => {
  try {
    const result = await authService.requestLoginOtp(req.body);
    return ApiResponse.success(
      res,
      result,
      result.is_new_user ? 'New user' : 'OTP generated successfully'
    );
  } catch (error) {
    if (error.message === 'Invalid credentials') {
      return ApiResponse.unauthorized(res, error.message);
    }
    next(error);
  }
};

const loginWithOtp = async (req, res, next) => {
  try {
    const clientInfo = {
      ip: req.ip,
      user_agent: req.headers['user-agent'],
      platform: req.headers['x-platform'] || 'web',
    };
    const result = await authService.loginWithOtp(req.body, clientInfo);
    return ApiResponse.success(
      res,
      result,
      result.is_new_user ? 'New user' : 'Logged in successfully'
    );
  } catch (error) {
    if (error.message === 'Invalid credentials' || error.message === 'User account is not active') {
      return ApiResponse.unauthorized(res, error.message);
    }
    next(error);
  }
};

// route uses authController.refresh
const refresh = async (req, res, next) => {
  try {
    const rt = req.body.refreshToken || req.body.refresh_token;
    if (!rt) return ApiResponse.error(res, 'Refresh token is required', 400);
    const result = await authService.refreshToken(rt);
    return ApiResponse.success(res, result, 'Tokens refreshed successfully');
  } catch (error) {
    return ApiResponse.unauthorized(res, error.message);
  }
};

const logout = async (req, res, next) => {
  try {
    const rt = req.body.refreshToken || req.body.refresh_token;
    await authService.logout(req.user.userId, rt);
    return ApiResponse.success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

// route uses authController.me
const me = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    return ApiResponse.success(res, user);
  } catch (error) {
    next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const user = await authService.updateProfile(req.user.userId, req.body);
    return ApiResponse.success(res, user, 'Profile updated successfully');
  } catch (error) {
    if (error.message === 'User not found') {
      return ApiResponse.notFound(res, error.message);
    }
    next(error);
  }
};

const getAddresses = async (req, res, next) => {
  try {
    const addresses = await authService.getAddresses(req.user.userId);
    return ApiResponse.success(res, addresses);
  } catch (error) {
    if (error.message === 'User not found') {
      return ApiResponse.notFound(res, error.message);
    }
    next(error);
  }
};

const addAddress = async (req, res, next) => {
  try {
    const address = await authService.addAddress(req.user.userId, req.body);
    return ApiResponse.success(res, address, 'Address added successfully', 201);
  } catch (error) {
    if (error.message === 'User not found') {
      return ApiResponse.notFound(res, error.message);
    }
    next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const address = await authService.updateAddress(
      req.user.userId,
      req.params.addressId,
      req.body
    );
    return ApiResponse.success(res, address, 'Address updated successfully');
  } catch (error) {
    if (error.message === 'User not found' || error.message === 'Address not found') {
      return ApiResponse.notFound(res, error.message);
    }
    next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    await authService.deleteAddress(req.user.userId, req.params.addressId);
    return ApiResponse.success(res, null, 'Address deleted successfully');
  } catch (error) {
    if (error.message === 'User not found' || error.message === 'Address not found') {
      return ApiResponse.notFound(res, error.message);
    }
    next(error);
  }
};

const setDefaultAddress = async (req, res, next) => {
  try {
    const address = await authService.setDefaultAddress(
      req.user.userId,
      req.params.addressId
    );
    return ApiResponse.success(res, address, 'Default address updated successfully');
  } catch (error) {
    if (error.message === 'User not found' || error.message === 'Address not found') {
      return ApiResponse.notFound(res, error.message);
    }
    next(error);
  }
};

module.exports = {
  register,
  login,
  loginWithPassword,
  requestOtp,
  loginWithOtp,
  refresh,
  logout,
  me,
  updateMe,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
