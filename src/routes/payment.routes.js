const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { authenticate, requireRole } = require('../middleware/auth');

router.post('/razorpay/order', authenticate, paymentController.createOrder);
router.post('/razorpay/verify', authenticate, paymentController.verifyPayment);
router.post('/razorpay/webhook', paymentController.handleWebhook);
router.get('/admin', authenticate, requireRole('SUPER_ADMIN', 'ADMIN'), paymentController.getPayments);

module.exports = router;
