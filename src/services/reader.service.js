const {
 MagazineEdition,
 MagazineSection,
 Subscription,
 MagazineBrand,
} = require("../models");

class ReaderService {
 async hasActiveSubscription(userId, brandId) {
  const subscription = await Subscription.findOne({
   user_id: userId,
   brand_id: brandId,
   status: "active",
   end_at: { $gt: new Date() },
  });

  return !!subscription;
 }

 async getPublishedEditions(filters = {}) {
  const { brandSlug, language = "en", page = 1, limit = 20 } = filters;

  let brandId;

  if (brandSlug) {
   const brand = await MagazineBrand.findOne({ slug: brandSlug });
   if (!brand) {
    throw new Error("Brand not found");
   }
   brandId = brand._id;
  }

  const query = { status: "published" };

  if (brandId) query.brand_id = brandId;
  if (language) query.language = language;

  const skip = (page - 1) * limit;

  const [editions, total] = await Promise.all([
   MagazineEdition.find(query)
    .populate("brand_id")
    .sort({ year: -1, month: -1 })
    .skip(skip)
    .limit(limit)
    .lean(),
   MagazineEdition.countDocuments(query),
  ]);

  return {
   editions,
   pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
   },
  };
 }

 async getEditionSections(editionId, userId) {
  const edition = await MagazineEdition.findById(editionId).lean();

  if (!edition || edition.status !== "published") {
   throw new Error("Edition not found or not published");
  }

  const hasSubscription = await this.hasActiveSubscription(
   userId,
   edition.brand_id
  );

  if (!hasSubscription) {
   throw new Error("Active subscription required");
  }

  const sections = await MagazineSection.find({
   edition_id: editionId,
   status: "published",
  })
   .sort({ slot_order: 1 })
   .lean();

  return {
   edition,
   sections,
  };
 }
}

module.exports = new ReaderService();
