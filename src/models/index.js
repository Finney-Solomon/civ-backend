const AuthAccount = require("./authAccount.model");
const AppUser = require("./appUser.model");

const MagazineBrand = require("./magazineBrand.model");
const MagazineTemplate = require("./magazineTemplate.model");
const MagazineEdition = require("./magazineEdition.model");
const MagazineSection = require("./magazineSection.model");

const AuthorAllocation = require("./authorAllocation.model");

const SubscriptionPlan = require("./subscriptionPlan.model");
const Subscription = require("./subscription.model");
const RazorpayPayment = require("./razorpayPayment.model");

const UserSession = require("./userSession.model");

const AuthorProfile = require("./authorProfile.model");

module.exports = {
  AuthAccount,
  AppUser,

  MagazineBrand,
  MagazineTemplate,
  MagazineEdition,
  MagazineSection,

  AuthorAllocation,

  SubscriptionPlan,
  Subscription,
  RazorpayPayment,

  UserSession,
  AuthorProfile,
};
