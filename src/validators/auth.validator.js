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
}).or('email', 'phone');

const loginSchema = Joi.object({
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  password: Joi.string().required(),
}).or('email', 'phone');

const refreshSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
};
