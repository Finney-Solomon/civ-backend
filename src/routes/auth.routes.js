const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  passwordLoginSchema,
  otpRequestSchema,
  otpLoginSchema,
  refreshSchema,
  updateProfileSchema,
  createAddressSchema,
  updateAddressSchema,
} = require('../validators/auth.validator');
const { authenticate } = require('../middleware/auth');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post(
  '/login/password',
  validate(passwordLoginSchema),
  authController.loginWithPassword
);
router.post('/otp/request', validate(otpRequestSchema), authController.requestOtp);
router.post('/login/otp', validate(otpLoginSchema), authController.loginWithOtp);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateMe);
router.get('/me/addresses', authenticate, authController.getAddresses);
router.post(
  '/me/addresses',
  authenticate,
  validate(createAddressSchema),
  authController.addAddress
);
router.put(
  '/me/addresses/:addressId',
  authenticate,
  validate(updateAddressSchema),
  authController.updateAddress
);
router.delete('/me/addresses/:addressId', authenticate, authController.deleteAddress);
router.patch(
  '/me/addresses/:addressId/default',
  authenticate,
  authController.setDefaultAddress
);

module.exports = router;
