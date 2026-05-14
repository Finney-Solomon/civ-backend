const DEFAULT_RULES = {
  allow_audio: true,
  allow_images: true,
  allow_verses: true,
  allow_lists: true,
  allow_highlights: true,
  enabled_fields: [],
};

const normalizeEnabledFields = (fields) => {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((field) => String(field || "").trim())
    .filter(Boolean);
};

const buildSlotRulesMap = (template) => {
  const slots = template?.slots || [];
  return new Map(
    slots.map((slot) => [
      slot.key,
      {
        ...DEFAULT_RULES,
        ...(slot.rules || {}),
        enabled_fields: normalizeEnabledFields(slot.defaults?.enabled_fields),
      },
    ])
  );
};

const applyRulesToSection = (section, rules = DEFAULT_RULES, options = {}) => {
  const content = { ...(section.content || {}) };
  const effectiveRules = { ...DEFAULT_RULES, ...(rules || {}) };

  if (!effectiveRules.allow_audio) {
    delete content.audio;
  }

  if (!effectiveRules.allow_images) {
    delete content.header_image;
    delete content.images;
  }

  if (!effectiveRules.allow_verses) {
    delete content.bible_verses;
  }

  if (!effectiveRules.allow_lists) {
    delete content.lists;
  }

  if (!effectiveRules.allow_highlights) {
    delete content.highlights;
  }

  if (!options.ignoreEnabledFields && effectiveRules.enabled_fields.length) {
    const allowedFields = new Set([
      "section_type",
      "page_number",
      ...effectiveRules.enabled_fields,
    ]);

    Object.keys(content).forEach((key) => {
      if (!allowedFields.has(key)) {
        delete content[key];
      }
    });
  }

  return { ...section, content };
};

const applyTemplateRulesToSections = (sections = [], template, options = {}) => {
  const slotRulesByKey = buildSlotRulesMap(template);

  return sections.map((section) =>
    applyRulesToSection(section, slotRulesByKey.get(section.slot_key), options)
  );
};

module.exports = {
  applyTemplateRulesToSections,
};
