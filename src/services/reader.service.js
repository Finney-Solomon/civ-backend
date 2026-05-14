const {
  MagazineEdition,
  MagazineSection,
  MagazineTemplate,
  Subscription,
  MagazineBrand,
} = require("../models");
const cacheService = require('./cache.service');
const {
  formatEditionSectionsForReader,
  withAudioAvailabilityDefault,
} = require("./editionAudio.service");
const { applyTemplateRulesToSections } = require("./templateRules.service");

/**
 * Check for an active subscription
 */
const hasActiveSubscription = async (userId, brandId) => {
  const subscription = await Subscription.findOne({
    user_id: userId,
    brand_id: brandId,
    status: "active",
    end_at: { $gt: new Date() },
  });

  const isActive = !!subscription;
  // Cache result for 5 minutes to handle concurrency spikes
  if (userId && brandId) {
    await cacheService.set(`cache:sub:${userId}:${brandId}`, isActive, 300);
  }

  return isActive;
};

/**
 * Get subscription status with cache lookup
 */
const getHasActiveSubscription = async (userId, brandId) => {
  const cacheKey = `cache:sub:${userId}:${brandId}`;
  const cached = await cacheService.get(cacheKey);
  if (cached !== null) return cached;
  
  return hasActiveSubscription(userId, brandId);
};

const getTemplateForRules = async (edition) => {
  if (edition?.template_id?.slots) return edition.template_id;
  if (!edition?.template_id) return null;
  return MagazineTemplate.findById(edition.template_id).lean();
};

const defaultAudio = () => ({
  url: "",
  key: "",
  mime_type: "audio/mpeg",
  size_bytes: 0,
  duration_sec: 0,
  bitrate: 0,
  language: "en-IN",
  voice: "default",
  narrator: "",
  provider: "google",
  status: "not_generated",
  content_hash: "",
  text_length: 0,
  error_message: "",
  retry_count: 0,
  is_cached: false,
  version: 1,
  segments: [],
  playback_speed: 1,
});

const normalizeSectionContent = (section) => {
  const content = section?.content || {};

  return {
    ...section,
    content: {
      section_type: content.section_type || "other",
      title: content.title || "",
      subtitle: content.subtitle || "",
      author_print_name: content.author_print_name || "",
      source_credit: content.source_credit || "",
      summary: content.summary || "",
      body: content.body || "",
      bible_verses: Array.isArray(content.bible_verses) ? content.bible_verses : [],
      highlights: Array.isArray(content.highlights) ? content.highlights : [],
      lists: Array.isArray(content.lists) ? content.lists : [],
      header_image: content.header_image || {},
      images: Array.isArray(content.images) ? content.images : [],
      audio: content.audio || defaultAudio(),
      page_number: Number.isFinite(Number(content.page_number))
        ? Number(content.page_number)
        : 0,
    },
  };
};

/**
 * Retrieve published editions for readers
 */
const getPublishedEditions = async (filters = {}) => {
  const { brandSlug, language = "en", page = 1, limit = 20 } = filters;

  const cacheKey = `cache:editions:pub:${brandSlug || 'all'}:${language}:${page}:${limit}`;
  const cachedData = await cacheService.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  let brandId;

  if (brandSlug) {
    const brandCacheKey = `cache:brandId:${brandSlug}`;
    brandId = await cacheService.get(brandCacheKey);

    if (!brandId) {
      const brand = await MagazineBrand.findOne({ slug: brandSlug });
      if (!brand) {
        throw new Error("Brand not found");
      }
      brandId = brand._id;
      // Cache brand mapping for 24 hours
      await cacheService.set(brandCacheKey, brandId, 86400);
    }
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

  const result = {
    editions: editions.map(withAudioAvailabilityDefault),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };

  // Cache result for 15 minutes
  await cacheService.set(cacheKey, result, 900);

  return result;
};

/**
 * Retrieve sections for a specific edition
 */
const getEditionSections = async (editionId, userId) => {
  const cacheKey = `cache:editionSections:${editionId}`;
  let editionData = await cacheService.get(cacheKey);

  if (!editionData) {
    const edition = await MagazineEdition.findById(editionId)
      .populate("template_id")
      .lean();

    if (!edition || edition.status !== "published") {
      throw new Error("Edition not found or not published");
    }

    const sections = await MagazineSection.find({
      edition_id: editionId,
      status: "published",
    })
      .sort({ slot_order: 1 })
      .lean();

    editionData = { edition, sections };
    // Cache for 1 hour
    await cacheService.set(cacheKey, editionData, 3600);
  }

  const hasSubscription = await getHasActiveSubscription(
    userId,
    editionData.edition.brand_id
  );

  if (!hasSubscription) {
    throw new Error("Active subscription required");
  }

  const template = await getTemplateForRules(editionData.edition);
  const formatted = formatEditionSectionsForReader(editionData);

  return {
    ...formatted,
    has_active_subscription: true,
    sections: applyTemplateRulesToSections(
      formatted.sections,
      template
    ),
  };
};

/**
 * Retrieve complete mobile edition details in one response.
 */
const getEditionDetails = async (editionId, userId) => {
  const cacheKey = `cache:editionDetails:${editionId}`;
  let editionData = await cacheService.get(cacheKey);

  if (!editionData) {
    const edition = await MagazineEdition.findById(editionId)
      .populate("brand_id")
      .populate("template_id")
      .lean();

    if (!edition || edition.status !== "published") {
      throw new Error("Edition not found or not published");
    }

    const sections = await MagazineSection.find({
      edition_id: editionId,
      status: "published",
    })
      .sort({ slot_order: 1 })
      .lean();

    editionData = { edition, sections };
    await cacheService.set(cacheKey, editionData, 3600);
  }

  const hasSubscription = await getHasActiveSubscription(
    userId,
    editionData.edition.brand_id?._id || editionData.edition.brand_id
  );

  if (!hasSubscription) {
    throw new Error("Active subscription required");
  }

  const template = await getTemplateForRules(editionData.edition);
  const normalizedSections = (editionData.sections || []).map(normalizeSectionContent);

  return {
    edition: withAudioAvailabilityDefault(editionData.edition),
    has_active_subscription: true,
    sections: applyTemplateRulesToSections(normalizedSections, template, {
      ignoreEnabledFields: true,
    }),
  };
};

module.exports = {
  hasActiveSubscription,
  getHasActiveSubscription,
  getPublishedEditions,
  getEditionDetails,
  getEditionSections,
};
