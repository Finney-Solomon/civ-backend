const { MagazineBrand, MagazineEdition, AppUser, Subscription, RazorpayPayment } = require("../models");

/**
 * Get the first day of the current month
 */
const startOfMonth = (d = new Date()) => {
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * Aggregate high-level dashboard metrics (Admin only)
 */
const getOverview = async ({ brand_id } = {}) => {
  const monthStart = startOfMonth(new Date());

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
    MagazineBrand.countDocuments({ status: { $ne: "archived" } }),
    MagazineBrand.countDocuments({ status: "active" }),

    MagazineEdition.countDocuments({ ...brandFilter, status: "published" }),
    MagazineEdition.countDocuments({
      ...brandFilter,
      status: "published",
      published_at: { $gte: monthStart },
    }),

    AppUser.countDocuments({}),
    AppUser.countDocuments({ status: "active" }),

    Subscription.countDocuments({ ...brandFilter, status: "active" }),

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
};

module.exports = {
  getOverview,
};
