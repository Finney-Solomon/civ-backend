const { MagazineEdition, MagazineSection, MagazineTemplate } = require('../models');


class EditionService {
 async createEdition(data) {
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

  const edition = await MagazineEdition.create(data);

  await this.createSectionsFromTemplate(edition, template);

  return edition;
 }

 async createSectionsFromTemplate(edition, template) {
  const slots = template.slots || [];

  const sections = slots.map((slot) => {
   const d = slot.defaults || {};
   return {
    edition_id: edition._id,
    brand_id: edition.brand_id,
    slot_key: slot.key,
    slot_label: slot.label,
    slot_order: slot.order,
    content: {
     section_type: d.section_type || "other",
     title: d.title || "",
     subtitle: d.subtitle || "",
     summary: d.summary || "",
     body: d.body || "",
     author_print_name: d.author_print_name || "",
     source_credit: d.source_credit || "",
     bible_verses: [],
     highlights: [],
     lists: [],
     header_image: {},
     images: [],
     audio: {},
     page_number: 0,
    },
    status: "empty",
   };
  });

  await MagazineSection.insertMany(sections);
 }

 async getAllEditions(filters = {}) {
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
   editions,
   pagination: {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
   },
  };
 }

 async getEditionById(id) {
  const edition = await MagazineEdition.findById(id)
   .populate("brand_id")
   .populate("template_id")
   .populate("managed_by")
   .lean();

  if (!edition) {
   throw new Error("Edition not found");
  }

  return edition;
 }

 async updateEdition(id, data) {
  const edition = await MagazineEdition.findByIdAndUpdate(
   id,
   { $set: data },
   { new: true, runValidators: true }
  )
   .populate("brand_id")
   .populate("template_id");

  if (!edition) {
   throw new Error("Edition not found");
  }

  return edition;
 }

 async publishEdition(id) {
  const edition = await MagazineEdition.findById(id);

  if (!edition) {
   throw new Error("Edition not found");
  }

  const sections = await MagazineSection.find({ edition_id: id });

  const requiredSections = sections.filter(
   (s) => s.status !== "approved" && s.status !== "published"
  );

  if (requiredSections.length > 0) {
   throw new Error("All sections must be approved before publishing");
  }

  edition.status = "published";
  edition.published_at = new Date();
  await edition.save();

  await MagazineSection.updateMany({ edition_id: id }, { status: "published" });

  return edition;
 }

 async unpublishEdition(id) {
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

  return edition;
 }

 async generateSections(editionId) {
  const edition = await MagazineEdition.findById(editionId);
  if (!edition) throw new Error("Edition not found");

  const template = await MagazineTemplate.findById(edition.template_id);
  if (!template) throw new Error("Template not found");

  const slots = template.slots || [];

  // existing sections map
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
     section_type: s.defaults?.section_type || "other",
     title: s.defaults?.title || s.label || "",
     subtitle: s.defaults?.subtitle || "",
     summary: s.defaults?.summary || "",
     body: s.defaults?.body || "",
     author_print_name: s.defaults?.author_print_name || "",
     source_credit: s.defaults?.source_credit || "",
     bible_verses: [],
     highlights: [],
     lists: [],
     header_image: {},
     images: [],
     audio: {},
     page_number: 0,
    },

    status: "draft",
    created_by: edition.managed_by || null,
    updated_by: edition.managed_by || null,
   }));

  if (toCreate.length) await MagazineSection.insertMany(toCreate);

  const all = await MagazineSection.find({ edition_id: edition._id }).sort({
   slot_order: 1,
  });
  return { created: toCreate.length, sections: all };
 }
 async getEditionSections(editionId) {
  const edition = await MagazineEdition.findById(editionId);
  if (!edition) {
    throw new Error("Edition not found");
  }

  const sections = await MagazineSection.find({ edition_id: editionId })
    .sort({ slot_order: 1 })
    .lean();

  return sections;
}
}


module.exports = new EditionService();
