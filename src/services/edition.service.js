const { MagazineEdition, MagazineSection, MagazineTemplate } = require('../models');
const cacheService = require('./cache.service');
const {
  areAllSectionAudiosGenerated,
  setEditionAudioAvailability,
  withAudioAvailabilityDefault,
} = require('./editionAudio.service');
const { applyTemplateRulesToSections } = require('./templateRules.service');

const normalizeArr = (v) => {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null) return [];
  return [v];
};

const SECTION_CONTENT_FIELDS = [
  "section_type",
  "title",
  "subtitle",
  "summary",
  "body",
  "author_print_name",
  "source_credit",
  "bible_verses",
  "verses",
  "highlights",
  "lists",
  "header_image",
  "images",
  "audio",
  "page_number",
];

const buildContentPatch = (data = {}) => {
  const source = data || {};
  const content = { ...(source.content || {}) };

  SECTION_CONTENT_FIELDS.forEach((field) => {
    if (source[field] === undefined) return;
    if (field === "verses") content.bible_verses = source.verses;
    else content[field] = source[field];
  });

  if (content.bible_verses !== undefined) {
    content.bible_verses = normalizeArr(content.bible_verses);
  }
  if (content.highlights !== undefined) content.highlights = normalizeArr(content.highlights);
  if (content.lists !== undefined) content.lists = normalizeArr(content.lists);
  if (content.images !== undefined) content.images = normalizeArr(content.images);

  if (content.page_number !== undefined) {
    const pageNumber = Number(content.page_number);
    content.page_number = Number.isFinite(pageNumber) ? pageNumber : 0;
  }

  return content;
};

const buildSectionContentFromDefaults = (defaults = {}, label = "") => ({
  section_type: defaults.section_type || "other",
  title: defaults.title || label || "",
  subtitle: defaults.subtitle || "",
  summary: defaults.summary || "",
  body: defaults.body || "",
  author_print_name: defaults.author_print_name || "",
  source_credit: defaults.source_credit || "",
  bible_verses: normalizeArr(defaults.bible_verses ?? defaults.verses ?? []),
  highlights: normalizeArr(defaults.highlights),
  lists: normalizeArr(defaults.lists),
  header_image: defaults.header_image || {},
  images: normalizeArr(defaults.images),
  audio: defaults.audio || {},
  page_number: Number.isFinite(Number(defaults.page_number))
    ? Number(defaults.page_number)
    : 0,
});

const pickEditionFields = (data = {}) => {
  const allowed = [
    "brand_id",
    "year",
    "month",
    "language",
    "publication_date",
    "volume",
    "edition_no",
    "cover_title",
    "masthead",
    "cover_front_url",
    "cover_back_url",
    "pdf_url",
    "template_id",
    "managed_by",
    "author_id",
  ];

  return Object.fromEntries(
    allowed
      .filter((key) => data[key] !== undefined)
      .map((key) => [key, data[key]])
  );
};

const findSectionPayload = (sectionsByKey, slot) =>
  sectionsByKey.get(slot.key) || sectionsByKey.get(slot.label) || {};

/**
 * Helper to create sections for an edition based on its template
 * @param {object} edition 
 * @param {object} template 
 */
const createSectionsFromTemplate = async (edition, template) => {
  const slots = template.slots || [];

  const sections = slots.map((slot) => {
    const d = slot.defaults || {};
    return {
      edition_id: edition._id,
      brand_id: edition.brand_id,
      slot_key: slot.key,
      slot_label: slot.label,
      slot_order: slot.order,
      content: buildSectionContentFromDefaults(d, ""),
      status: "empty",
    };
  });

  await MagazineSection.insertMany(sections);
};

/**
 * Initialize a new magazine edition
 */
const createEdition = async (data) => {
  const { brand_id, year, month, language, template_id } = data;

  const existing = await MagazineEdition.findOne({
    brand_id,
    year,
    month,
    language,
  });

  if (existing) {
    throw new Error("Edition already exists for this month and language");
  }

  const template = await MagazineTemplate.findById(template_id);

  if (!template) {
    throw new Error("Template not found");
  }

  const edition = await MagazineEdition.create({ ...data, is_audio_available: false });
  await createSectionsFromTemplate(edition, template);

  return withAudioAvailabilityDefault(edition);
};

/**
 * Search and Paginate all editions (Admin only)
 */
const getAllEditions = async (filters = {}) => {
  const {
    brand_id,
    year,
    month,
    language,
    status,
    page = 1,
    limit = 20,
  } = filters;
  const query = {};

  if (brand_id) query.brand_id = brand_id;
  if (year) query.year = parseInt(year);
  if (month) query.month = parseInt(month);
  if (language) query.language = language;
  if (status) query.status = status;

  const skip = (page - 1) * limit;

  const [editions, total] = await Promise.all([
    MagazineEdition.find(query)
      .populate("brand_id")
      .populate("template_id")
      .populate("managed_by")
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MagazineEdition.countDocuments(query),
  ]);

  return {
    editions: editions.map(withAudioAvailabilityDefault),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get detailed edition data
 */
const getEditionById = async (id) => {
  const edition = await MagazineEdition.findById(id)
    .populate("brand_id")
    .populate("template_id")
    .populate("managed_by")
    .lean();

  if (!edition) {
    throw new Error("Edition not found");
  }

  return withAudioAvailabilityDefault(edition);
};

/**
 * Update edition metadata and invalidate cache
 */
const updateEdition = async (id, data) => {
  const update = { ...data };

  if (update.is_audio_available !== undefined) {
    const requestedAudioAvailable = update.is_audio_available === true || update.is_audio_available === "true";
    update.is_audio_available = requestedAudioAvailable
      ? await areAllSectionAudiosGenerated(id)
      : false;
  }

  const edition = await MagazineEdition.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  )
    .populate("brand_id")
    .populate("template_id");

  if (!edition) {
    throw new Error("Edition not found");
  }

  // Invalidate caches
  await cacheService.delByPattern('cache:editions:pub:*');
  await cacheService.del(`cache:editionSections:${id}`);
  await cacheService.del(`cache:editionDetails:${id}`);

  return withAudioAvailabilityDefault(edition);
};

/**
 * Set edition to published status and sync sections
 */
const publishEdition = async (id) => {
  const edition = await MagazineEdition.findById(id);

  if (!edition) {
    throw new Error("Edition not found");
  }

  // In-service validation can be re-enabled here
  // const sections = await MagazineSection.find({ edition_id: id });

  edition.status = "published";
  edition.published_at = new Date();
  await edition.save();

  await MagazineSection.updateMany({ edition_id: id }, { status: "published" });

  // Invalidate caches
  await cacheService.delByPattern('cache:editions:pub:*');
  await cacheService.del(`cache:editionSections:${id}`);
  await cacheService.del(`cache:editionDetails:${id}`);

  return withAudioAvailabilityDefault(edition);
};

/**
 * Create/update an edition, upsert all template sections, and publish in one call.
 */
const createAndPublishEdition = async (data = {}, userId = null) => {
  const { brand_id, year, month, language = "en", template_id } = data;

  if (!brand_id) {
    const err = new Error("brand_id is required");
    err.statusCode = 400;
    throw err;
  }
  if (!year || !month || !template_id) {
    const err = new Error("year, month, and template_id are required");
    err.statusCode = 400;
    throw err;
  }

  const template = await MagazineTemplate.findById(template_id).lean();
  if (!template) {
    throw new Error("Template not found");
  }

  const editionPatch = pickEditionFields({
    ...data,
    language,
    managed_by: data.managed_by || userId || null,
  });
  editionPatch.status = "published";
  editionPatch.published_at = new Date();

  const edition = await MagazineEdition.findOneAndUpdate(
    { brand_id, year, month, language },
    { $set: editionPatch, $setOnInsert: { is_audio_available: false } },
    { new: true, upsert: true, runValidators: true }
  );

  const sectionsByKey = new Map();
  normalizeArr(data.sections).forEach((section) => {
    const keys = [
      section?.slot_key,
      section?.key,
      section?.slot_label,
      section?.label,
    ];

    keys
      .map((key) => String(key || "").trim())
      .filter(Boolean)
      .forEach((key) => sectionsByKey.set(key, section || {}));
  });

  const slots = template.slots || [];
  const upsertedSections = [];

  for (const slot of slots) {
    const sectionPayload = findSectionPayload(sectionsByKey, slot);
    const defaultsContent = buildSectionContentFromDefaults(slot.defaults || {}, slot.label);
    const contentPatch = buildContentPatch(sectionPayload);

    const content = {
      ...defaultsContent,
      ...contentPatch,
      section_type: contentPatch.section_type || defaultsContent.section_type || "other",
    };

    const section = await MagazineSection.findOneAndUpdate(
      { edition_id: edition._id, slot_key: slot.key },
      {
        $set: {
          brand_id: edition.brand_id,
          slot_label: sectionPayload.slot_label || slot.label,
          slot_order: Number.isFinite(Number(sectionPayload.slot_order))
            ? Number(sectionPayload.slot_order)
            : slot.order,
          content,
          status: "published",
          updated_by: userId || edition.managed_by || null,
        },
        $setOnInsert: {
          edition_id: edition._id,
          slot_key: slot.key,
          created_by: userId || edition.managed_by || null,
        },
      },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    upsertedSections.push(section);
  }

  await cacheService.delByPattern('cache:editions:pub:*');
  await cacheService.del(`cache:editionSections:${edition._id}`);
  await cacheService.del(`cache:editionDetails:${edition._id}`);

  const populatedEdition = await MagazineEdition.findById(edition._id)
    .populate("brand_id")
    .populate("template_id")
    .populate("managed_by")
    .lean();

  return {
    edition: withAudioAvailabilityDefault(populatedEdition),
    sections: applyTemplateRulesToSections(
      upsertedSections.sort((a, b) => a.slot_order - b.slot_order),
      template
    ),
  };
};

/**
 * Return edition to draft status
 */
const unpublishEdition = async (id) => {
  const edition = await MagazineEdition.findByIdAndUpdate(
    id,
    { status: "draft", published_at: null },
    { new: true }
  );

  if (!edition) {
    throw new Error("Edition not found");
  }

  await MagazineSection.updateMany(
    { edition_id: id, status: "published" },
    { status: "approved" }
  );

  // Invalidate caches
  await cacheService.delByPattern('cache:editions:pub:*');
  await cacheService.del(`cache:editionSections:${id}`);
  await cacheService.del(`cache:editionDetails:${id}`);

  return withAudioAvailabilityDefault(edition);
};

/**
 * Generate missing sections from current template
 */
const generateSections = async (editionId) => {
  const edition = await MagazineEdition.findById(editionId);
  if (!edition) throw new Error("Edition not found");

  const template = await MagazineTemplate.findById(edition.template_id);
  if (!template) throw new Error("Template not found");

  const slots = template.slots || [];

  const existing = await MagazineSection.find({ edition_id: edition._id })
    .select("slot_key")
    .lean();
  const existingKeys = new Set(existing.map((s) => s.slot_key));

  const toCreate = slots
    .filter((s) => !existingKeys.has(s.key))
    .map((s) => ({
      edition_id: edition._id,
      brand_id: edition.brand_id,
      slot_key: s.key,
      slot_label: s.label,
      slot_order: s.order,

      content: {
        ...buildSectionContentFromDefaults(s.defaults, s.label),
      },

      status: "draft",
      created_by: edition.managed_by || null,
      updated_by: edition.managed_by || null,
    }));

  if (toCreate.length) {
    await MagazineSection.insertMany(toCreate);
    await setEditionAudioAvailability(editionId, false);
  }

  const all = await MagazineSection.find({ edition_id: edition._id })
    .sort({ slot_order: 1 })
    .lean();

  return {
    created: toCreate.length,
    sections: applyTemplateRulesToSections(all, template),
  };
};

/**
 * Retrieve sections for a specific edition (Admin internal)
 */
const getEditionSections = async (editionId) => {
  const edition = await MagazineEdition.findById(editionId)
    .populate("template_id")
    .lean();
  if (!edition) {
    throw new Error("Edition not found");
  }

  const sections = await MagazineSection.find({ edition_id: editionId })
    .sort({ slot_order: 1 })
    .lean();

  return applyTemplateRulesToSections(sections, edition.template_id);
};

module.exports = {
  createEdition,
  createAndPublishEdition,
  getAllEditions,
  getEditionById,
  updateEdition,
  publishEdition,
  unpublishEdition,
  generateSections,
  getEditionSections,
  createSectionsFromTemplate,
};
