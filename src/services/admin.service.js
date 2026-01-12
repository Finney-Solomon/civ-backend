// src/services/admin.service.js
const { MagazineBrand, MagazineEdition, AppUser, Subscription, RazorpayPayment } = require("../models");

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

class AdminService {
  async getOverview({ brand_id } = {}) {
    const monthStart = startOfMonth(new Date());

    // Optional filter by brand_id for some metrics
    const brandFilter = brand_id ? { brand_id } : {};
    const brandId = brand_id || null;

    const [
      magazinesTotal,
      magazinesActive,

      publishedEditionsTotal,
      publishedEditionsThisMonth,

      usersTotal,
      usersActive,

      activeSubscriptionsTotal,

      paymentsPaidTotal,
      paymentsPaidThisMonth,
    ] = await Promise.all([
      // Magazines = MagazineBrand
      MagazineBrand.countDocuments({ status: { $ne: "archived" } }),
      MagazineBrand.countDocuments({ status: "active" }),

      // Editions published
      MagazineEdition.countDocuments({ ...brandFilter, status: "published" }),
      MagazineEdition.countDocuments({
        ...brandFilter,
        status: "published",
        published_at: { $gte: monthStart },
      }),

      // Users
      AppUser.countDocuments({}),
      AppUser.countDocuments({ status: "active" }),

      // Subscriptions active
      Subscription.countDocuments({ ...brandFilter, status: "active" }),

      // Payments paid
      RazorpayPayment.countDocuments({ ...brandFilter, status: "paid" }),
      RazorpayPayment.countDocuments({
        ...brandFilter,
        status: "paid",
        paid_at: { $gte: monthStart },
      }),
    ]);

    return {
      scope: brandId ? { brand_id: brandId } : { brand_id: null },

      magazines: {
        total: magazinesTotal,
        active: magazinesActive,
      },

      editions: {
        published_total: publishedEditionsTotal,
        published_this_month: publishedEditionsThisMonth,
      },

      users: {
        total: usersTotal,
        active: usersActive,
      },

      subscriptions: {
        active_total: activeSubscriptionsTotal,
      },

      payments: {
        paid_total: paymentsPaidTotal,
        paid_this_month: paymentsPaidThisMonth,
      },
    };
  }
}

module.exports = new AdminService();
