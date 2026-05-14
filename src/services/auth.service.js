const { AuthAccount, AppUser, UserSession } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const crypto = require('crypto');

const OTP_TTL_MINUTES = Number(process.env.LOGIN_OTP_TTL_MINUTES || 10);
const DEFAULT_LOGIN_OTP = process.env.DEFAULT_LOGIN_OTP || '3303';
const OTP_SERVICE_ENABLED = process.env.OTP_SERVICE_ENABLED === 'true';

/**
 * Format internal user/account data for public consumption
 */
const formatUser = (user, account) => {
  return {
    id: user._id,
    email: user.email,
    phone: user.phone,
    display_name: user.display_name,
    first_name: user.first_name,
    last_name: user.last_name,
    gender: user.gender,
    roles: user.roles,
    profile_photo_url: user.profile_photo_url,
    addresses: user.addresses || [],
    is_email_verified: account?.is_email_verified || false,
    is_phone_verified: account?.is_phone_verified || false,
  };
};

const buildIdentifierQuery = ({ email, phone } = {}) => ({
  $or: [
    { email: email || null },
    { phone: phone || null },
  ].filter((condition) => Object.values(condition)[0] !== null),
});

const findAccountByIdentifier = (data = {}) => {
  const query = buildIdentifierQuery(data);
  if (!query.$or.length) return null;
  return AuthAccount.findOne(query);
};

const buildNewUserLoginResponse = (data = {}) => ({
  is_new_user: true,
  user_exists: false,
  identifier: {
    email: data.email || "",
    phone: data.phone || "",
  },
  user: null,
  accessToken: null,
  refreshToken: null,
});

const hashOtp = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

const generateOtp = () => {
  if (!OTP_SERVICE_ENABLED) return DEFAULT_LOGIN_OTP;
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
};

/**
 * Generate Access and Refresh tokens for a user session
 */
const generateTokens = async (userId, clientInfo = {}) => {
  const payload = { userId: userId.toString() };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await UserSession.create({
    user_id: userId,
    refresh_token_hash: refreshTokenHash,
    platform: clientInfo.platform || 'unknown',
    device_id: clientInfo.device_id || '',
    device_name: clientInfo.device_name || '',
    ip: clientInfo.ip || '',
    user_agent: clientInfo.user_agent || '',
    expires_at: expiresAt,
  });

  return { accessToken, refreshToken };
};

/**
 * Register a new user and account
 */
const register = async (data) => {
  const { email, phone, password, first_name, last_name, display_name, gender } = data;

  const existingAccount = await findAccountByIdentifier({ email, phone });

  if (existingAccount) {
    throw new Error('Email or phone already registered');
  }

  const passwordHash = await hashPassword(password);

  const account = await AuthAccount.create({
    email: email || undefined,
    phone: phone || undefined,
    password_hash: passwordHash,
    last_login_at: new Date(),
  });

  const user = await AppUser.create({
    account_id: account._id,
    email: email || '',
    phone: phone || '',
    first_name: first_name || '',
    last_name: last_name || '',
    display_name: display_name || first_name || '',
    gender: gender || '',
    roles: [{ role: 'USER', brand_ids: [] }],
  });

  const tokens = await generateTokens(user._id);

  return {
    user: formatUser(user, account),
    ...tokens,
  };
};

/**
 * Request an OTP for an existing user.
 */
const requestLoginOtp = async (data = {}) => {
  const account = await findAccountByIdentifier(data);

  if (!account) {
    return buildNewUserLoginResponse(data);
  }

  if (account.status !== 'active') {
    throw new Error('Invalid credentials');
  }

  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  account.login_otp_hash = hashOtp(otp);
  account.login_otp_expires_at = expiresAt;
  await account.save();

  return {
    is_new_user: false,
    user_exists: true,
    otp_expires_at: expiresAt,
    ...(process.env.NODE_ENV === 'production' ? {} : { otp }),
  };
};

/**
 * Authenticate existing user with email/phone and password.
 */
const loginWithPassword = async (data, clientInfo = {}) => {
  const { password } = data;
  const account = await findAccountByIdentifier(data);

  if (!account) {
    return buildNewUserLoginResponse(data);
  }

  if (account.status !== 'active') {
    throw new Error('Invalid credentials');
  }

  const isMatch = await comparePassword(password, account.password_hash);

  if (!isMatch) {
    throw new Error('Invalid credentials');
  }

  account.last_login_at = new Date();
  await account.save();

  const user = await AppUser.findOne({ account_id: account._id });

  if (!user || user.status !== 'active') {
    throw new Error('User account is not active');
  }

  const tokens = await generateTokens(user._id, clientInfo);

  return {
    is_new_user: false,
    user_exists: true,
    user: formatUser(user, account),
    ...tokens,
  };
};

/**
 * Authenticate existing user with email/phone and OTP.
 */
const loginWithOtp = async (data, clientInfo = {}) => {
  const { otp } = data;
  const account = await findAccountByIdentifier(data);

  if (!account) {
    return buildNewUserLoginResponse(data);
  }

  if (account.status !== 'active') {
    throw new Error('Invalid credentials');
  }

  const otpHash = hashOtp(otp);
  const isExpired =
    !account.login_otp_expires_at ||
    account.login_otp_expires_at.getTime() < Date.now();

  if (!account.login_otp_hash || account.login_otp_hash !== otpHash || isExpired) {
    throw new Error('Invalid credentials');
  }

  account.login_otp_hash = "";
  account.login_otp_expires_at = null;
  account.last_login_at = new Date();
  await account.save();

  const user = await AppUser.findOne({ account_id: account._id });

  if (!user || user.status !== 'active') {
    throw new Error('User account is not active');
  }

  const tokens = await generateTokens(user._id, clientInfo);

  return {
    is_new_user: false,
    user_exists: true,
    user: formatUser(user, account),
    ...tokens,
  };
};

/**
 * Authenticate existing user.
 */
const login = async (data, clientInfo = {}) => {
  const loginType = data.login_type || (data.otp ? 'otp' : 'password');

  if (loginType === 'otp') {
    return loginWithOtp(data, clientInfo);
  }

  return loginWithPassword(data, clientInfo);
};

/**
 * Rotate Refresh Token
 */
const refreshToken = async (rt) => {
  const decoded = verifyRefreshToken(rt);

  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(rt)
    .digest('hex');

  const session = await UserSession.findOne({
    user_id: decoded.userId,
    refresh_token_hash: refreshTokenHash,
    revoked_at: null,
    expires_at: { $gt: new Date() },
  });

  if (!session) {
    throw new Error('Invalid or expired refresh token');
  }

  session.revoked_at = new Date();
  await session.save();

  const newTokens = await generateTokens(decoded.userId);
  return newTokens;
};

/**
 * Revoke user session (Logout)
 */
const logout = async (userId, rt) => {
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(rt)
    .digest('hex');

  await UserSession.updateOne(
    { user_id: userId, refresh_token_hash: refreshTokenHash },
    { revoked_at: new Date() }
  );

  return true;
};

const getCurrentUser = async (userId) => {
  const user = await AppUser.findById(userId).populate('account_id');
  if (!user || user.status !== 'active') {
    throw new Error('User account is not active');
  }
  return formatUser(user, user.account_id);
};

const updateProfile = async (userId, data = {}) => {
  const allowedFields = [
    'display_name',
    'first_name',
    'last_name',
    'gender',
    'profile_photo_url',
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (data[field] !== undefined) updates[field] = data[field];
  });

  const user = await AppUser.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate('account_id');

  if (!user) {
    throw new Error('User not found');
  }

  return formatUser(user, user.account_id);
};

const getAddresses = async (userId) => {
  const user = await AppUser.findById(userId).select('addresses').lean();
  if (!user) throw new Error('User not found');
  return user.addresses || [];
};

const ensureSingleDefaultAddress = (user, defaultAddressId) => {
  user.addresses.forEach((address) => {
    address.is_default = String(address._id) === String(defaultAddressId);
  });
};

const addAddress = async (userId, data = {}) => {
  const user = await AppUser.findById(userId);
  if (!user) throw new Error('User not found');

  if (data.is_default || !user.addresses.length) {
    user.addresses.forEach((address) => {
      address.is_default = false;
    });
    data.is_default = true;
  }

  user.addresses.push(data);
  await user.save();
  return user.addresses[user.addresses.length - 1];
};

const updateAddress = async (userId, addressId, data = {}) => {
  const user = await AppUser.findById(userId);
  if (!user) throw new Error('User not found');

  const address = user.addresses.id(addressId);
  if (!address) throw new Error('Address not found');

  Object.keys(data).forEach((key) => {
    address[key] = data[key];
  });

  if (data.is_default) {
    ensureSingleDefaultAddress(user, address._id);
  }

  await user.save();
  return address;
};

const deleteAddress = async (userId, addressId) => {
  const user = await AppUser.findById(userId);
  if (!user) throw new Error('User not found');

  const address = user.addresses.id(addressId);
  if (!address) throw new Error('Address not found');

  const wasDefault = address.is_default;
  address.deleteOne();

  if (wasDefault && user.addresses.length) {
    user.addresses[0].is_default = true;
  }

  await user.save();
  return true;
};

const setDefaultAddress = async (userId, addressId) => {
  const user = await AppUser.findById(userId);
  if (!user) throw new Error('User not found');

  const address = user.addresses.id(addressId);
  if (!address) throw new Error('Address not found');

  ensureSingleDefaultAddress(user, address._id);
  await user.save();
  return address;
};

module.exports = {
  register,
  login,
  loginWithPassword,
  loginWithOtp,
  requestLoginOtp,
  generateTokens,
  refreshToken,
  logout,
  formatUser,
  getCurrentUser,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
