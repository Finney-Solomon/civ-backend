const razorpayService = require('../services/razorpay.service');
const { RazorpayPayment } = require('../models');
const ApiResponse = require('../utils/apiResponse');

class PaymentController {
  async createOrder(req, res, next) {
    try {
      const { plan_id } = req.body;
      const userId = req.user.userId;

      const clientInfo = {
        platform: req.body.platform || 'web',
        device_id: req.body.device_id || '',
        ip: req.ip,
        user_agent: req.headers['user-agent'] || '',
      };

      const order = await razorpayService.createOrder(userId, plan_id, clientInfo);
      return ApiResponse.success(res, order, 'Order created successfully', 201);
    } catch (error) {
      if (error.message.includes('Invalid')) {
        return ApiResponse.error(res, error.message, 400);
      }
      next(error);
    }
  }

  async verifyPayment(req, res, next) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      const result = await razorpayService.verifyPayment({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (result.alreadyProcessed) {
        return ApiResponse.success(res, result, 'Payment already processed');
      }

      return ApiResponse.success(res, result, 'Payment verified and subscription activated');
    } catch (error) {
      if (error.message.includes('Invalid signature')) {
        return ApiResponse.error(res, 'Payment verification failed', 400);
      }
      if (error.message.includes('not found')) {
        return ApiResponse.notFound(res, error.message);
      }
      next(error);
    }
  }

  async handleWebhook(req, res, next) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const body = JSON.stringify(req.body);

      const isValid = razorpayService.verifyWebhookSignature(body, signature);

      if (!isValid) {
        return ApiResponse.error(res, 'Invalid webhook signature', 400);
      }

      const result = await razorpayService.handleWebhook(req.body);

      return res.status(200).json({ status: 'ok' });
    } catch (error) {
      next(error);
    }
  }

  async getPayments(req, res, next) {
    try {
      const { brand_id, status, user_id, page = 1, limit = 20 } = req.query;
      const query = {};

      if (brand_id) query.brand_id = brand_id;
      if (status) query.status = status;
      if (user_id) query.user_id = user_id;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [payments, total] = await Promise.all([
        RazorpayPayment.find(query)
          .populate('user_id', 'display_name email phone')
          .populate('brand_id', 'name slug')
          .populate('plan_id', 'name price_inr')
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        RazorpayPayment.countDocuments(query),
      ]);

      return ApiResponse.success(res, {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
