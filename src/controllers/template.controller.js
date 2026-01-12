// apps/server/controllers/template.controller.js
const { MagazineTemplate } = require("../models");
const ApiResponse = require("../utils/apiResponse");

/* ---------------- helpers ---------------- */
function normalizeSlots(slots = []) {
  if (!Array.isArray(slots)) return [];

  const normalized = slots.map((s, idx) => {
    const key = String(s?.key || "").trim();
    const label = String(s?.label || "").trim();

    return {
      ...s,
      key,
      label,
      order: Number.isFinite(s?.order) ? s.order : idx + 1,
      required: typeof s?.required === "boolean" ? s.required : true,
      rules: {
        allow_audio: s?.rules?.allow_audio ?? true,
        allow_images: s?.rules?.allow_images ?? true,
        allow_verses: s?.rules?.allow_verses ?? true,
        allow_lists: s?.rules?.allow_lists ?? true,
        allow_highlights: s?.rules?.allow_highlights ?? true,
      },
      defaults: s?.defaults || {},
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

    return ApiResponse.success(res, { templates });
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

    return ApiResponse.success(res, { template });
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
      { template: populated },
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

    return ApiResponse.success(res, { template }, "Template updated successfully");
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
      { template },
      "Template deactivated successfully"
    );
  } catch (error) {
    next(error);
  }
};
