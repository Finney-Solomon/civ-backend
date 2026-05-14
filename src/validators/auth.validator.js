const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().trim().optional(),
  last_name: Joi.string().trim().optional(),
  display_name: Joi.string().trim().optional(),
  gender: Joi.string()
    .trim()
    .lowercase()
    .valid('male', 'female', 'other', 'prefer_not_to_say')
    .optional(),
}).or('email', 'phone');

const loginSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  login_type: Joi.string().valid('password', 'otp').optional(),
  password: Joi.string().optional(),
  otp: Joi.string().pattern(/^\d{4,8}$/).optional(),
})
  .or('email', 'phone')
  .xor('password', 'otp')
  .custom((value, helpers) => {
    if (value.login_type === 'password' && !value.password) {
      return helpers.error('any.custom', { message: 'password is required' });
    }
    if (value.login_type === 'otp' && !value.otp) {
      return helpers.error('any.custom', { message: 'otp is required' });
    }
    return value;
  });

const passwordLoginSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  password: Joi.string().required(),
}).or('email', 'phone');

const otpRequestSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
}).or('email', 'phone');

const otpLoginSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  otp: Joi.string().pattern(/^\d{4,8}$/).required(),
}).or('email', 'phone');

const refreshSchema = Joi.object({
  refresh_token: Joi.string().optional(),
  refreshToken: Joi.string().optional(),
}).xor('refresh_token', 'refreshToken');

const updateProfileSchema = Joi.object({
  display_name: Joi.string().trim().allow('').optional(),
  first_name: Joi.string().trim().allow('').optional(),
  last_name: Joi.string().trim().allow('').optional(),
  gender: Joi.string()
    .trim()
    .lowercase()
    .valid('', 'male', 'female', 'other', 'prefer_not_to_say')
    .optional(),
  profile_photo_url: Joi.string().trim().allow('').uri().optional(),
}).min(1);

const addressSchema = Joi.object({
  full_name: Joi.string().trim().allow('').optional(),
  phone: Joi.string().trim().allow('').optional(),
  line1: Joi.string().trim().allow('').optional(),
  line2: Joi.string().trim().allow('').optional(),
  city: Joi.string().trim().allow('').optional(),
  state: Joi.string().trim().allow('').optional(),
  country: Joi.string().trim().allow('').optional(),
  zip_code: Joi.string().trim().allow('').optional(),
  landmark: Joi.string().trim().allow('').optional(),
  is_default: Joi.boolean().optional(),
});

const createAddressSchema = addressSchema.min(1);
const updateAddressSchema = addressSchema.min(1);

module.exports = {
  registerSchema,
  loginSchema,
  passwordLoginSchema,
  otpRequestSchema,
  otpLoginSchema,
  refreshSchema,
  updateProfileSchema,
  createAddressSchema,
  updateAddressSchema,
};
