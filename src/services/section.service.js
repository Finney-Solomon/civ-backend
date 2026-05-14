const { MagazineSection, MagazineEdition } = require("../models");
const { isValidObjectId } = require("mongoose");
const cacheService = require("./cache.service");
const {
  setEditionAudioAvailability,
  syncEditionAudioAvailability,
} = require("./editionAudio.service");

/**
 * Normalizes input to an array
 */
const normalizeArr = (v) => {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null) return [];
  return [v];
};

const AUDIO_SOURCE_FIELDS = ["title", "subtitle", "summary", "body"];

/**
 * Builds a content patch object from flat or nested payloads
 */
const buildContentPatch = (data = {}) => {
  const d = data || {};
  const content = { ...(d.content || {}) };

  const map = [
    "section_type",
    "title",
    "subtitle",
    "summary",
    "body",
    "author_print_name",
    "source_credit",
    "highlights",
    "lists",
    "images",
    "audio",
    "page_number",
    "bible_verses",
    "verses",
  ];

  for (const k of map) {
    if (d[k] !== undefined) {
      if (k === "verses") content.bible_verses = d.verses;
      else content[k] = d[k];
    }
  }

  if (content.highlights !== undefined)
    content.highlights = normalizeArr(content.highlights);
  if (content.lists !== undefined) content.lists = normalizeArr(content.lists);
  if (content.images !== undefined)
    content.images = normalizeArr(content.images);
  if (content.bible_verses !== undefined)
    content.bible_verses = normalizeArr(content.bible_verses);

  if (content.page_number !== undefined) {
    const n = Number(content.page_number);
    content.page_number = Number.isFinite(n) ? n : 0;
  }

  return content;
};

/**
 * Computes status based on content fullness
 */
const computeStatusFromContent = (content) => {
  const c = content || {};
  const title = String(c.title || "").trim();
  const summary = String(c.summary || "").trim();
  const body = String(c.body || "").trim();

  const hasAny = !!(title || summary || body);
  return hasAny ? "draft" : "empty";
};

const resetAudioMetadata = (audio = {}) => ({
  ...audio,
  url: "",
  key: "",
  status: "not_generated",
  content_hash: "",
  error_message: "",
  generated_at: null,
});

/**
 * Fetch a single section with its dependencies
 */
const getSectionById = async (id) => {
  const section = await MagazineSection.findById(id)
    .populate("edition_id")
    .populate("created_by")
    .populate("updated_by")
    .lean();

  if (!section) throw new Error("Section not found");
  return section;
};

/**
 * Update section data (content merging)
 */
const updateSection = async (id, userId, data) => {
  const section = await MagazineSection.findById(id);
  if (!section) throw new Error("Section not found");

  const contentPatch = buildContentPatch(data);
  const audioSourceChanged = AUDIO_SOURCE_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(contentPatch, field)
  );

  if (Object.keys(contentPatch).length > 0) {
    const current = section.content?.toObject
      ? section.content.toObject()
      : section.content || {};
    section.content = { ...current, ...contentPatch };

    if (audioSourceChanged) {
      section.content.audio = resetAudioMetadata(current.audio);
    }
  }

  section.status = computeStatusFromContent(section.content);
  section.updated_by = userId;
  await section.save();

  if (audioSourceChanged) {
    await setEditionAudioAvailability(section.edition_id, false);
  } else if (Object.keys(contentPatch).length > 0) {
    await cacheService.del(`cache:editionSections:${section.edition_id}`);
    await cacheService.del(`cache:editionDetails:${section.edition_id}`);
    await cacheService.delByPattern("cache:editions:pub:*");

    if (contentPatch.audio !== undefined) {
      await syncEditionAudioAvailability(section.edition_id);
    }
  }

  return section;
};

/**
 * Change status to in_review
 */
const submitForReview = async (id) => {
  const section = await MagazineSection.findById(id);
  if (!section) throw new Error("Section not found");

  if (computeStatusFromContent(section.content) === "empty") {
    throw new Error("Cannot submit empty section for review");
  }

  section.status = "in_review";
  section.review.submitted_at = new Date();
  await section.save();
  return section;
};

/**
 * Mark section as approved by Admin
 */
const approveSection = async (id, userId, notes = "") => {
  const section = await MagazineSection.findById(id);
  if (!section) throw new Error("Section not found");

  section.status = "approved";
  section.review.reviewed_by = userId;
  section.review.reviewed_at = new Date();
  section.review.reviewer_notes = notes;
  await section.save();
  return section;
};

/**
 * Reject a section back to draft
 */
const rejectSection = async (id, userId, notes) => {
  const section = await MagazineSection.findById(id);
  if (!section) throw new Error("Section not found");

  section.status = "draft";
  section.review.reviewed_by = userId;
  section.review.reviewed_at = new Date();
  section.review.reviewer_notes = notes;
  await section.save();
  return section;
};

/**
 * Create a new section document manually for an edition
 */
const createForEdition = async (editionId, userId, data = {}) => {
  if (!isValidObjectId(editionId)) {
    const err = new Error("Invalid editionId");
    err.statusCode = 400;
    throw err;
  }
  if (userId && !isValidObjectId(userId)) {
    const err = new Error("Invalid userId");
    err.statusCode = 400;
    throw err;
  }

  const edition = await MagazineEdition.findById(editionId).lean();
  if (!edition) {
    const err = new Error("Edition not found");
    err.statusCode = 404;
    throw err;
  }

  const slotKey = String(data?.slot_key || "").trim();
  if (!slotKey) {
    const err = new Error("slot_key is required");
    err.statusCode = 400;
    throw err;
  }

  const existing = await MagazineSection.findOne({
    edition_id: editionId,
    slot_key: slotKey,
  });
  if (existing) return existing;

  const doc = await MagazineSection.create({
    edition_id: editionId,
    brand_id: edition.brand_id,
    slot_key: slotKey,
    slot_label: String(data?.slot_label || slotKey),
    slot_order: Number.isFinite(Number(data?.slot_order))
      ? Number(data?.slot_order)
      : 0,

    content: {
      section_type: String(data?.section_type || "other"),
      title: String(data?.title || ""),
      subtitle: String(data?.subtitle || ""),
      summary: String(data?.summary || ""),
      body: String(data?.body || ""),
      author_print_name: String(data?.author_print_name || ""),
      source_credit: String(data?.source_credit || ""),
      bible_verses: normalizeArr(data?.bible_verses ?? data?.verses ?? []),
      highlights: normalizeArr(data?.highlights),
      lists: normalizeArr(data?.lists),
      images: normalizeArr(data?.images),
      audio: data?.audio ?? null,
      page_number: Number.isFinite(Number(data?.page_number))
        ? Number(data?.page_number)
        : 0,
    },

    status: computeStatusFromContent({
      title: data?.title,
      summary: data?.summary,
      body: data?.body,
    }),
    created_by: userId || null,
    updated_by: userId || null,
  });

  await setEditionAudioAvailability(editionId, false);

  return doc;
};

/**
 * Hard delete a section
 */
const deleteSection = async (sectionId) => {
  const sec = await MagazineSection.findById(sectionId);
  if (!sec) throw new Error("Section not found");
  const editionId = sec.edition_id;
  await MagazineSection.deleteOne({ _id: sectionId });
  await syncEditionAudioAvailability(editionId);
  return { deleted: true, sectionId };
};

module.exports = {
  getSectionById,
  updateSection,
  submitForReview,
  approveSection,
  rejectSection,
  createForEdition,
  deleteSection,
};
