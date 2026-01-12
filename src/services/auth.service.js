const { AuthAccount, AppUser, UserSession } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const crypto = require('crypto');

class AuthService {
  async register(data) {
    const { email, phone, password, first_name, last_name, display_name } = data;

    const existingAccount = await AuthAccount.findOne({
      $or: [
        { email: email || null },
        { phone: phone || null },
      ].filter((condition) => Object.values(condition)[0] !== null),
    });

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
      roles: [{ role: 'USER', brand_ids: [] }],
    });

    const tokens = await this.generateTokens(user._id);

    return {
      user: this.formatUser(user, account),
      ...tokens,
    };
  }

  async login(data, clientInfo = {}) {
    const { email, phone, password } = data;

    const account = await AuthAccount.findOne({
      $or: [
        { email: email || null },
        { phone: phone || null },
      ].filter((condition) => Object.values(condition)[0] !== null),
    });

    if (!account || account.status !== 'active') {
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

    const tokens = await this.generateTokens(user._id, clientInfo);

    return {
      user: this.formatUser(user, account),
      ...tokens,
    };
  }

  async generateTokens(userId, clientInfo = {}) {
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
  }

  async refreshToken(refreshToken) {
    const decoded = verifyRefreshToken(refreshToken);

    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
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

    const newTokens = await this.generateTokens(decoded.userId);

    return newTokens;
  }

  async logout(userId, refreshToken) {
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await UserSession.updateOne(
      { user_id: userId, refresh_token_hash: refreshTokenHash },
      { revoked_at: new Date() }
    );

    return true;
  }

  formatUser(user, account) {
    return {
      id: user._id,
      email: user.email,
      phone: user.phone,
      display_name: user.display_name,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: user.roles,
      profile_photo_url: user.profile_photo_url,
      is_email_verified: account?.is_email_verified || false,
      is_phone_verified: account?.is_phone_verified || false,
    };
  }
}

module.exports = new AuthService();
