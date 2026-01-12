const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config');
const { RazorpayPayment, Subscription, SubscriptionPlan } = require('../models');

class RazorpayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
  }

  async createOrder(userId, planId, clientInfo = {}) {
    const plan = await SubscriptionPlan.findById(planId);

    if (!plan || !plan.is_active) {
      throw new Error('Invalid or inactive subscription plan');
    }

    const amountPaise = plan.price_inr * 100;

    const orderOptions = {
      amount: amountPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}_${userId}`,
      notes: {
        user_id: userId.toString(),
        plan_id: planId.toString(),
        brand_id: plan.brand_id.toString(),
      },
    };

    const razorpayOrder = await this.razorpay.orders.create(orderOptions);

    const payment = await RazorpayPayment.create({
      user_id: userId,
      brand_id: plan.brand_id,
      plan_id: planId,
      amount_paise: amountPaise,
      currency: 'INR',
      status: 'created',
      razorpay: {
        order_id: razorpayOrder.id,
      },
      client: {
        platform: clientInfo.platform || 'unknown',
        device_id: clientInfo.device_id || '',
        ip: clientInfo.ip || '',
        user_agent: clientInfo.user_agent || '',
      },
    });

    return {
      payment_id: payment._id,
      razorpay_order_id: razorpayOrder.id,
      amount: plan.price_inr,
      currency: 'INR',
      plan_name: plan.name,
    };
  }

  async verifyPayment(paymentData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    const generated_signature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      throw new Error('Invalid payment signature');
    }

    const payment = await RazorpayPayment.findOne({
      'razorpay.order_id': razorpay_order_id,
    });

    if (!payment) {
      throw new Error('Payment record not found');
    }

    if (payment.status === 'paid') {
      return {
        payment,
        subscription: await Subscription.findById(payment.subscription_id),
        alreadyProcessed: true,
      };
    }

    payment.status = 'paid';
    payment.razorpay.payment_id = razorpay_payment_id;
    payment.razorpay.signature = razorpay_signature;
    payment.paid_at = new Date();
    await payment.save();

    const subscription = await this.activateSubscription(payment);

    payment.subscription_id = subscription._id;
    await payment.save();

    return { payment, subscription, alreadyProcessed: false };
  }

  async activateSubscription(payment) {
    const plan = await SubscriptionPlan.findById(payment.plan_id);

    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    const existingSubscription = await Subscription.findOne({
      user_id: payment.user_id,
      brand_id: payment.brand_id,
      status: 'active',
    });

    let subscription;

    if (existingSubscription) {
      const newEndDate = new Date(existingSubscription.end_at);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      existingSubscription.end_at = newEndDate;
      existingSubscription.last_payment_id = payment._id;
      await existingSubscription.save();

      subscription = existingSubscription;
    } else {
      const startDate = new Date();
      const endDate = new Date();

      if (plan.period === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      subscription = await Subscription.create({
        user_id: payment.user_id,
        brand_id: payment.brand_id,
        plan_id: plan._id,
        start_at: startDate,
        end_at: endDate,
        status: 'active',
        last_payment_id: payment._id,
      });
    }

    return subscription;
  }

  async handleWebhook(event) {
    const eventId = event.id;

    const existingEvent = await RazorpayPayment.findOne({
      'razorpay.webhook_events.event_id': eventId,
    });

    if (existingEvent) {
      return { processed: false, reason: 'duplicate_event' };
    }

    const eventType = event.event;
    const payload = event.payload;

    let payment;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const orderId = payload.payment?.entity?.order_id || payload.order?.entity?.id;

      if (orderId) {
        payment = await RazorpayPayment.findOne({
          'razorpay.order_id': orderId,
        });

        if (payment) {
          payment.razorpay.webhook_events.push({
            event_id: eventId,
            event_type: eventType,
            received_at: new Date(),
          });

          if (payment.status === 'created' || payment.status === 'attempted') {
            payment.status = 'paid';
            payment.paid_at = new Date();
            payment.razorpay.payment_id = payload.payment?.entity?.id || '';

            await payment.save();

            if (!payment.subscription_id) {
              const subscription = await this.activateSubscription(payment);
              payment.subscription_id = subscription._id;
              await payment.save();
            }
          } else {
            await payment.save();
          }
        }
      }
    } else if (eventType === 'payment.failed') {
      const orderId = payload.payment?.entity?.order_id;

      if (orderId) {
        payment = await RazorpayPayment.findOne({
          'razorpay.order_id': orderId,
        });

        if (payment) {
          payment.status = 'failed';
          payment.failed_at = new Date();
          payment.failure = {
            code: payload.payment?.entity?.error_code || '',
            description: payload.payment?.entity?.error_description || '',
            source: payload.payment?.entity?.error_source || '',
            step: payload.payment?.entity?.error_step || '',
            reason: payload.payment?.entity?.error_reason || '',
          };
          payment.razorpay.webhook_events.push({
            event_id: eventId,
            event_type: eventType,
            received_at: new Date(),
          });

          await payment.save();
        }
      }
    } else if (eventType.startsWith('refund.')) {
      const paymentId = payload.refund?.entity?.payment_id;

      if (paymentId) {
        payment = await RazorpayPayment.findOne({
          'razorpay.payment_id': paymentId,
        });

        if (payment) {
          payment.razorpay.refunds.push({
            refund_id: payload.refund?.entity?.id || '',
            amount_paise: payload.refund?.entity?.amount || 0,
            status: payload.refund?.entity?.status || '',
            created_at: new Date(payload.refund?.entity?.created_at * 1000),
            notes: '',
          });

          if (eventType === 'refund.processed') {
            payment.status = 'refunded';
            payment.refunded_at = new Date();
          }

          payment.razorpay.webhook_events.push({
            event_id: eventId,
            event_type: eventType,
            received_at: new Date(),
          });

          await payment.save();
        }
      }
    }

    return { processed: true, payment };
  }

  verifyWebhookSignature(body, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }
}

module.exports = new RazorpayService();
