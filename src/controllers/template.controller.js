// apps/server/controllers/template.controller.js
const { MagazineEdition, MagazineTemplate } = require("../models");
const cacheService = require("../services/cache.service");
const ApiResponse = require("../utils/apiResponse");

/* ---------------- helpers ---------------- */
const normalizeArr = (v) => {
  if (Array.isArray(v)) return v;
  if (v === undefined || v === null) return [];
  return [v];
};

const normalizeStringArr = (v) =>
  normalizeArr(v)
    .map((item) => String(item || "").trim())
    .filter(Boolean);

const normalizeDefaults = (defaults = {}) => {
  const normalized = { ...(defaults || {}) };

  normalized.bible_verses = normalizeArr(
    normalized.bible_verses ?? normalized.verses ?? []
  );
  delete normalized.verses;

  if (normalized.audio === undefined || normalized.audio === null) {
    normalized.audio = {};
  }

  if (normalized.content_order !== undefined) {
    normalized.content_order = normalizeStringArr(normalized.content_order);
  }
  if (normalized.enabled_fields !== undefined) {
    normalized.enabled_fields = normalizeStringArr(normalized.enabled_fields);
  }

  return normalized;
};

const shapeDefaultsForResponse = (defaults = {}) => {
  const enabledFields = normalizeStringArr(defaults.enabled_fields);

  if (!enabledFields.length) {
    return defaults;
  }

  const allowed = new Set([
    "section_type",
    "content_order",
    "enabled_fields",
    ...enabledFields,
  ]);

  return Object.fromEntries(
    Object.entries(defaults).filter(([key]) => allowed.has(key))
  );
};

const shapeTemplateForResponse = (template) => {
  if (!template) return template;

  return {
    ...template,
    slots: (template.slots || []).map((slot) => ({
      ...slot,
      defaults: shapeDefaultsForResponse(slot.defaults || {}),
    })),
  };
};

function normalizeSlots(slots = []) {
  if (!Array.isArray(slots)) return [];

  const normalized = slots.map((s, idx) => {
    const key = String(s?.key || "").trim();
    const label = String(s?.label || "").trim();
    const order = Number(s?.order);

    return {
      ...s,
      key,
      label,
      order: Number.isFinite(order) ? order : idx + 1,
      required: typeof s?.required === "boolean" ? s.required : true,
      rules: {
        allow_audio: s?.rules?.allow_audio ?? true,
        allow_images: s?.rules?.allow_images ?? true,
        allow_verses: s?.rules?.allow_verses ?? true,
        allow_lists: s?.rules?.allow_lists ?? true,
        allow_highlights: s?.rules?.allow_highlights ?? true,
      },
      defaults: normalizeDefaults(s?.defaults),
    };
  });

  // Validate unique keys
  const keys = normalized.map((x) => x.key).filter(Boolean);
  if (new Set(keys).size !== keys.length) {
    const err = new Error("Duplicate slot keys are not allowed");
    err.statusCode = 400;
    throw err;
  }

  return normalized.sort((a, b) => a.order - b.order);
}

function normalizeReorderItems(items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("slots must be a non-empty array");
    err.statusCode = 400;
    throw err;
  }

  const normalized = items.map((item) => {
    const key = String(item?.key || item?.slot_key || "").trim();
    const order = Number(item?.order ?? item?.slot_order);

    if (!key || !Number.isFinite(order)) {
      const err = new Error("Each slot reorder item requires key and order");
      err.statusCode = 400;
      throw err;
    }

    return { key, order };
  });

  const keys = normalized.map((x) => x.key);
  if (new Set(keys).size !== keys.length) {
    const err = new Error("Duplicate slot keys are not allowed");
    err.statusCode = 400;
    throw err;
  }

  return normalized;
}

async function invalidateEditionCachesForTemplate(templateId) {
  const editions = await MagazineEdition.find({ template_id: templateId })
    .select("_id")
    .lean();

  await Promise.all([
    cacheService.delByPattern("cache:editions:pub:*"),
    ...editions.map((edition) =>
      cacheService.del(`cache:editionSections:${edition._id}`)
    ),
  ]);
}

/* ---------------- CONTROLLERS ---------------- */

/**
 * GET /api/v1/templates
 */
exports.getTemplates = async (req, res, next) => {
  try {
    const { brandId, language, is_active } = req.query;

    const query = {};
    if (brandId) query.brand_id = brandId;
    if (language) query.language = language;
    if (typeof is_active !== "undefined") {
      query.is_active = String(is_active) === "true";
    }

    const templates = await MagazineTemplate.find(query)
      .populate("brand_id", "name slug supported_languages status")
      .sort({ created_at: -1 })
      .lean();

    return ApiResponse.success(res, {
      templates: templates.map(shapeTemplateForResponse),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/templates/:id
 */
exports.getTemplateById = async (req, res, next) => {
  try {
    const template = await MagazineTemplate.findById(req.params.id)
      .populate("brand_id", "name slug supported_languages status")
      .lean();

    if (!template) {
      return ApiResponse.notFound(res, "Template not found");
    }

    return ApiResponse.success(res, {
      template: shapeTemplateForResponse(template),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/templates
 */
exports.createTemplate = async (req, res, next) => {
  try {
    const { brand_id, name, language = "en", slots = [], is_active = true } = req.body;

    if (!brand_id) return ApiResponse.badRequest(res, "brand_id is required");
    if (!name) return ApiResponse.badRequest(res, "name is required");

    const normalizedSlots = normalizeSlots(slots);

    const template = await MagazineTemplate.create({
      brand_id,
      name: String(name).trim(),
      language,
      slots: normalizedSlots,
      is_active,
    });

    const populated = await MagazineTemplate.findById(template._id)
      .populate("brand_id", "name slug supported_languages status")
      .lean();

    return ApiResponse.success(
      res,
      { template: shapeTemplateForResponse(populated) },
      "Template created successfully",
      201
    );
  } catch (error) {
    if (error?.code === 11000) {
      return ApiResponse.conflict(
        res,
        "Template already exists for this brand (and language)"
      );
    }
    next(error);
  }
};

/**
 * PUT /api/v1/templates/:id
 */
exports.updateTemplate = async (req, res, next) => {
  try {
    const patch = { ...req.body };

    if (patch.slots) {
      patch.slots = normalizeSlots(patch.slots);
    }
    if (patch.name) {
      patch.name = String(patch.name).trim();
    }

    const template = await MagazineTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { new: true, runValidators: true }
    )
      .populate("brand_id", "name slug supported_languages status")
      .lean();

    if (!template) {
      return ApiResponse.notFound(res, "Template not found");
    }

    await invalidateEditionCachesForTemplate(template._id);

    return ApiResponse.success(
      res,
      { template: shapeTemplateForResponse(template) },
      "Template updated successfully"
    );
  } catch (error) {
    if (error?.code === 11000) {
      return ApiResponse.conflict(
        res,
        "Template already exists for this brand (and language)"
      );
    }
    next(error);
  }
};

/**
 * PATCH /api/v1/templates/:id/slots/reorder
 */
exports.reorderTemplateSlots = async (req, res, next) => {
  try {
    const reorderItems = normalizeReorderItems(req.body?.slots);
    const template = await MagazineTemplate.findById(req.params.id);

    if (!template) {
      return ApiResponse.notFound(res, "Template not found");
    }

    const orderByKey = new Map(reorderItems.map((item) => [item.key, item.order]));
    const existingKeys = new Set(template.slots.map((slot) => slot.key));
    const missingKeys = reorderItems
      .map((item) => item.key)
      .filter((key) => !existingKeys.has(key));

    if (missingKeys.length) {
      return ApiResponse.badRequest(
        res,
        `Unknown slot keys: ${missingKeys.join(", ")}`
      );
    }

    template.slots.forEach((slot) => {
      if (orderByKey.has(slot.key)) {
        slot.order = orderByKey.get(slot.key);
      }
    });
    template.slots = [...template.slots].sort((a, b) => a.order - b.order);
    await template.save();

    const populated = await MagazineTemplate.findById(template._id)
      .populate("brand_id", "name slug supported_languages status")
      .lean();

    await invalidateEditionCachesForTemplate(template._id);

    return ApiResponse.success(
      res,
      { template: shapeTemplateForResponse(populated) },
      "Template slots reordered successfully"
    );
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/templates/:id
 * (soft delete)
 */
exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await MagazineTemplate.findByIdAndUpdate(
      req.params.id,
      { $set: { is_active: false } },
      { new: true }
    ).lean();

    if (!template) {
      return ApiResponse.notFound(res, "Template not found");
    }

    return ApiResponse.success(
      res,
      { template: shapeTemplateForResponse(template) },
      "Template deactivated successfully"
    );
  } catch (error) {
    next(error);
  }
};
