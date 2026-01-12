// src/controllers/admin.users.controller.js
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const ApiResponse = require("../utils/apiResponse");
const { AuthAccount, AppUser, MagazineBrand, AuthorProfile } = require("../models");

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

const normalizeRole = (role) => String(role || "USER").toUpperCase();

function hasRole(user, role) {
  const r = normalizeRole(role);
  return (user.roles || []).some((x) => x.role === r);
}

function upsertRole(user, role, brand_ids = []) {
  const r = normalizeRole(role);
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const existing = roles.find((x) => x.role === r);
  const brandSet = Array.from(new Set((brand_ids || []).map(String))).map((x) => toObjectId(x));

  if (existing) {
    // merge brand_ids
    const merged = Array.from(new Set([...(existing.brand_ids || []).map(String), ...brandSet.map(String)]));
    existing.brand_ids = merged.map((x) => toObjectId(x));
  } else {
    roles.push({ role: r, brand_ids: brandSet });
  }
  user.roles = roles;
}

function removeRole(user, role) {
  const r = normalizeRole(role);
  user.roles = (user.roles || []).filter((x) => x.role !== r);
}

async function ensureEmailOrPhoneUnique({ email, phone }) {
  if (!email && !phone) throw new Error("Email or phone is required");
  if (email) {
    const exists = await AuthAccount.findOne({ email }).lean();
    if (exists) throw new Error("Email already exists");
  }
  if (phone) {
    const exists = await AuthAccount.findOne({ phone }).lean();
    if (exists) throw new Error("Phone already exists");
  }
}

module.exports = {
  // GET /api/v1/admin/users?role=USER|AUTHOR|ADMIN&q=...&brandId=...
  async listUsers(req, res, next) {
    try {
      const { role, q, brandId, status, page = 1, limit = 20 } = req.query;

      const match = {};
      if (status) match.status = status;

      if (q) {
        const rx = new RegExp(String(q).trim(), "i");
        match.$or = [
          { display_name: rx },
          { first_name: rx },
          { last_name: rx },
          { email: rx },
          { phone: rx },
        ];
      }

      if (role) match["roles.role"] = normalizeRole(role);
      if (brandId) match["roles.brand_ids"] = toObjectId(brandId);

      const skip = (Number(page) - 1) * Number(limit);

      const [items, total] = await Promise.all([
        AppUser.find(match)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate("account_id")
          .lean(),
        AppUser.countDocuments(match),
      ]);

      return ApiResponse.success(res, { items, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/admin/users
  // body: { email?, phone?, password, display_name, first_name, last_name, role, brand_ids?, author_profile? }
  async createUser(req, res, next) {
    try {
      const {
        email,
        phone,
        password,
        display_name = "",
        first_name = "",
        last_name = "",
        role = "USER",
        brand_ids = [],
        author_profile,
      } = req.body;

      if (!password || String(password).length < 6) {
        return ApiResponse.error(res, "Password must be at least 6 characters", 400);
      }

      const normEmail = email ? String(email).trim().toLowerCase() : undefined;
      const normPhone = phone ? String(phone).trim() : undefined;

      await ensureEmailOrPhoneUnique({ email: normEmail, phone: normPhone });

      const password_hash = await bcrypt.hash(String(password), 10);

      const account = await AuthAccount.create({
        email: normEmail,
        phone: normPhone,
        password_hash,
        status: "active",
      });

      const user = new AppUser({
        account_id: account._id,
        display_name,
        first_name,
        last_name,
        email: normEmail || "",
        phone: normPhone || "",
        roles: [],
        status: "active",
      });

      // Add role + brand scope
      upsertRole(user, role, brand_ids);

      await user.save();

      // If author => create author profile table entry
     if (normalizeRole(role) === "AUTHOR") {
  await AuthorProfile.findOneAndUpdate(
    { user_id: user._id },
    {
      user_id: user._id,

      first_name: author_profile?.first_name || first_name || "",
      last_name: author_profile?.last_name || last_name || "",
      display_name:
        author_profile?.display_name ||
        display_name ||
        `${first_name} ${last_name}`.trim(),

      bio: author_profile?.bio || "",
      profile_photo_url: author_profile?.profile_photo_url || "",

      designation: author_profile?.designation || "",
      experience_years: Number(author_profile?.experience_years || 0),
      ministry_affiliation: author_profile?.ministry_affiliation || "",

      role: author_profile?.role || "author",
      status: author_profile?.status || "active",
      is_verified: Boolean(author_profile?.is_verified),

      email: normEmail || "",
      phone: { country_code: "+91", number: normPhone || "" },

      location: author_profile?.location || {},

      brand_ids: (brand_ids || []).map((x) => toObjectId(x)),
      languages: author_profile?.languages?.length ? author_profile.languages : ["en"],
      socials: author_profile?.socials || {},

      created_by: req.user.userId,
      updated_by: req.user.userId,
    },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
}


      const full = await AppUser.findById(user._id).populate("account_id").lean();

      return ApiResponse.success(res, full, "User created", 201);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/admin/users/:id
  async getUser(req, res, next) {
    try {
      const user = await AppUser.findById(req.params.id).populate("account_id").lean();
      if (!user) return ApiResponse.notFound(res, "User not found");

      const author = await AuthorProfile.findOne({ user_id: user._id })
        .populate("brand_ids", "name slug")
        .lean();

      return ApiResponse.success(res, { user, author });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/admin/users/:id
  // body can update names, role, brand_ids
  async updateUser(req, res, next) {
    try {
      const { display_name, first_name, last_name, role, brand_ids } = req.body;

      const user = await AppUser.findById(req.params.id);
      if (!user) return ApiResponse.notFound(res, "User not found");

      if (display_name !== undefined) user.display_name = display_name;
      if (first_name !== undefined) user.first_name = first_name;
      if (last_name !== undefined) user.last_name = last_name;

      if (role) {
        // Keep one primary role? If you want multiple roles, remove this block.
        // Here: we set exactly one of USER/AUTHOR/ADMIN (not removing SUPER_ADMIN)
        const keepSuper = hasRole(user, "SUPER_ADMIN");

        user.roles = keepSuper ? user.roles.filter((r) => r.role === "SUPER_ADMIN") : [];

        upsertRole(user, role, brand_ids || []);
      } else if (brand_ids) {
        // update brand scope for existing roles
        (user.roles || []).forEach((r) => {
          r.brand_ids = (brand_ids || []).map((x) => toObjectId(x));
        });
      }

      await user.save();

      // If role now AUTHOR => ensure author profile exists
      const nowAuthor = hasRole(user, "AUTHOR");
      if (nowAuthor) {
        await AuthorProfile.findOneAndUpdate(
          { user_id: user._id },
          {
            user_id: user._id,
            brand_ids: (brand_ids || []).map((x) => toObjectId(x)),
            updated_by: req.user.userId,
          },
          { upsert: true, new: true }
        );
      }

      const updated = await AppUser.findById(user._id).populate("account_id").lean();
      return ApiResponse.success(res, updated, "User updated");
    } catch (err) {
      next(err);
    }
  },

  // PATCH /api/v1/admin/users/:id/status  body: { status: "active"|"blocked" }
  async updateUserStatus(req, res, next) {
    try {
      const { status } = req.body;
      if (!["active", "blocked"].includes(String(status))) {
        return ApiResponse.error(res, "Invalid status", 400);
      }

      const user = await AppUser.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      )
        .populate("account_id")
        .lean();

      if (!user) return ApiResponse.notFound(res, "User not found");
      return ApiResponse.success(res, user, "Status updated");
    } catch (err) {
      next(err);
    }
  },

  // Authors
  async listAuthors(req, res, next) {
    try {
      const { q, brandId, status, page = 1, limit = 20 } = req.query;
      const match = {};
      if (status) match.status = status;
      if (brandId) match.brand_ids = toObjectId(brandId);

      const userMatch = {};
      if (q) {
        const rx = new RegExp(String(q).trim(), "i");
        userMatch.$or = [{ display_name: rx }, { email: rx }, { phone: rx }];
      }

      const skip = (Number(page) - 1) * Number(limit);

      const pipeline = [
        { $match: match },
        {
          $lookup: {
            from: "app_users",
            localField: "user_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        ...(Object.keys(userMatch).length ? [{ $match: { "user.display_name": userMatch.$or?.[0]?.display_name } }] : []),
        { $sort: { created_at: -1 } },
        { $skip: skip },
        { $limit: Number(limit) },
      ];

      // For simplicity: use populate in query (more readable)
      const items = await AuthorProfile.find(match)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user_id")
        .populate("brand_ids", "name slug")
        .lean();

      const total = await AuthorProfile.countDocuments(match);

      return ApiResponse.success(res, { items, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
      next(err);
    }
  },

  async getAuthor(req, res, next) {
    try {
      const doc = await AuthorProfile.findOne({ user_id: req.params.userId })
        .populate("user_id")
        .populate("brand_ids", "name slug")
        .lean();
      if (!doc) return ApiResponse.notFound(res, "Author profile not found");
      return ApiResponse.success(res, doc);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/admin/authors/:userId
// PUT /api/v1/admin/authors/:userId
async upsertAuthor(req, res, next) {
  try {
    const userId = req.params.userId;

    // ensure user exists
    const user = await AppUser.findById(userId);
    if (!user) return ApiResponse.notFound(res, "User not found");

    // ensure role AUTHOR exists
    if (!hasRole(user, "AUTHOR")) {
      upsertRole(user, "AUTHOR", req.body.brand_ids || []);
      await user.save();
    }

    const body = req.body || {};

    // ✅ Map payload to your AuthorProfile schema fields
    const update = {
      first_name: body.first_name ?? "",
      last_name: body.last_name ?? "",
      display_name:
        (body.display_name && String(body.display_name).trim()) ||
        `${body.first_name ?? ""} ${body.last_name ?? ""}`.trim(),

      bio: body.bio ?? "",
      profile_photo_url: body.profile_photo_url ?? "",

      designation: body.designation ?? "",
      experience_years: Number(body.experience_years || 0),
      ministry_affiliation: body.ministry_affiliation ?? "",

      role: body.role || "author",
      status: body.status || "active",
      is_verified: Boolean(body.is_verified),
      is_public: body.is_public === undefined ? true : Boolean(body.is_public),

      email: body.email ? String(body.email).trim().toLowerCase() : "",
      phone: {
        country_code: body.phone?.country_code || "+91",
        number: body.phone?.number || "",
      },

      location: {
        city: body.location?.city || "",
        state: body.location?.state || "",
        country: body.location?.country || "India",
        address_line: body.location?.address_line || "",
        pincode: body.location?.pincode || "",
      },

      brand_ids: (body.brand_ids || []).map((x) => toObjectId(x)),
      languages: Array.isArray(body.languages) && body.languages.length ? body.languages : ["en"],
      socials: body.socials || {},

      updated_by: req.user.userId,
    };

    // ✅ Update AuthorProfile by user_id (NOT by profile _id)
    const doc = await AuthorProfile.findOneAndUpdate(
      { user_id: user._id },
      { $set: update, $setOnInsert: { created_by: req.user.userId } },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    )
      .populate("user_id")
      .populate("brand_ids", "name slug")
      .lean();

    // ✅ (Optional but recommended) keep AppUser in sync too
    await AppUser.findByIdAndUpdate(
      user._id,
      {
        $set: {
          display_name: update.display_name,
          first_name: update.first_name,
          last_name: update.last_name,
          email: update.email,
          phone: update.phone.number,
        },
      },
      { new: true }
    );

    return ApiResponse.success(res, doc, "Author updated");
  } catch (err) {
    next(err);
  }
},


  async listAdmins(req, res, next) {
    try {
      const { q, page = 1, limit = 20 } = req.query;
      const match = { "roles.role": { $in: ["ADMIN", "SUPER_ADMIN"] } };

      if (q) {
        const rx = new RegExp(String(q).trim(), "i");
        match.$or = [
          { display_name: rx },
          { first_name: rx },
          { last_name: rx },
          { email: rx },
          { phone: rx },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [items, total] = await Promise.all([
        AppUser.find(match).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
        AppUser.countDocuments(match),
      ]);

      return ApiResponse.success(res, { items, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
      next(err);
    }
  },
};
