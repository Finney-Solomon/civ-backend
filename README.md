# ✝️ Christ Is Victor — Backend API

A production-ready Node.js/Express backend for a monthly Christian digital magazine. Built to handle 10,000+ concurrent readers with Redis caching, AWS S3 file storage, ElevenLabs neural TTS audio generation, and Razorpay payment processing.

---

## 🏗️ Architecture Overview

```
Client (Admin Dashboard / Reader App)
        │
        ▼
    Express API (Vercel Serverless)
        │
        ├── Mongoose ──► MongoDB Atlas
        ├── ioredis  ──► Redis (Cache + Rate Limiting)
        ├── AWS S3   ──► File Storage (Images, Audio, PDFs)
        ├── ElevenLabs ─► Text-to-Speech Generation
        └── Razorpay ──► Payment Processing
```

### Key Design Decisions
- **Functional style** — no ES6 classes; all services and controllers use plain `async` functions
- **Redis-backed caching** — editions & sections cached 15 min–1 hr; lazy warm on first hit
- **Cache invalidation** — publishing/updating an edition auto-flushes reader caches
- **Content hashing** — TTS audio reuses S3 files until section text changes (saves AWS billing)
- **Feature flags** — `USE_REDIS=false` lets you run locally without Redis; flip to `true` in production

---

## ⚙️ Environment Variables

Create a `.env` file in the root:

```env
# Server
NODE_ENV=production
PORT=5004

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/christ_is_victor

# JWT
JWT_SECRET=your-super-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis
USE_REDIS=true
REDIS_URI=redis://:password@host:6379

# AWS S3 (File Storage)
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=civ-magazine-assets

# ElevenLabs (Text-to-Speech)
# Get key at https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=your_api_key_here
# Default: Rachel — calm, clear English. Browse at https://elevenlabs.io/voice-library
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
# eleven_multilingual_v2 (best quality) | eleven_flash_v2_5 (fastest, lower latency)
ELEVENLABS_MODEL_ID=eleven_multilingual_v2

# Razorpay
RAZORPAY_KEY_ID=rzp_live_xxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=webhooksecret

# CORS
ALLOWED_ORIGINS=https://civ-admin.vercel.app,https://yourreaderapp.com
```

---

## 🚀 Running Locally

```bash
npm install
npm run dev
# Server starts on http://localhost:5004
```

Health check: `GET http://localhost:5004/health`

---

## 👤 Roles & Access Control

| Role         | Description |
|--------------|-------------|
| `SUPER_ADMIN` | Full access — manage brands, users, publish |
| `ADMIN`       | Manage editions, sections, subscriptions |
| `AUTHOR`      | Edit assigned sections, generate audio |
| `USER`        | Read published magazine (with subscription) |

All protected routes require: `Authorization: Bearer <accessToken>`

---

## 🔄 End-to-End Flows

### Flow 1: Admin Creates & Publishes a Monthly Edition

```
1. POST /api/v1/brands            → Create magazine brand
2. POST /api/v1/templates         → Create section template (editorial, story, message…)
3. POST /api/v1/editions          → Create edition for a month (auto-creates sections from template)
4. GET  /api/v1/editions/:id/sections → Review auto-created section slots
5. POST /api/v1/allocations       → Assign authors to edition
6. (Author) PATCH /api/v1/sections/:id → Fill in section content
7. (Author) POST /api/v1/sections/:id/submit-review → Submit for Admin review
8. (Admin)  POST /api/v1/sections/:id/approve       → Approve section
9. (Author) POST /api/v1/sections/:id/audio/generate → Generate TTS audio via ElevenLabs
10. POST /api/v1/editions/:id/publish → Publish edition (all sections go live + cache flushed)
```

### Flow 2: Reader Subscribes and Reads

```
1. POST /api/v1/auth/register     → Create account
2. POST /api/v1/auth/login        → Get access + refresh tokens
3. GET  /api/v1/subscriptions/plans?brandId=xxx → View available plans
4. POST /api/v1/payments/razorpay/order → Create Razorpay order
5. [Complete payment on client]
6. POST /api/v1/payments/razorpay/verify → Verify payment → activates subscription
7. GET  /api/v1/reader/editions   → Browse published editions
8. GET  /api/v1/reader/editions/:id/sections → Read edition (checks active subscription)
```

### Flow 3: File Upload (Admin/Author)

```
1. POST /api/v1/upload/image      → Upload cover/section image → returns public S3 URL
2. POST /api/v1/upload/audio      → Upload audio file → returns public S3 URL
3. POST /api/v1/upload/pdf        → Upload PDF → returns public S3 URL
4. (Use returned URL in section content body/header_image fields)
```

---

## 📡 API Reference

Base URL: `https://your-api.vercel.app/api/v1`

---

### 🔐 Authentication — `/auth`

| Method | Endpoint     | Auth | Body | Description |
|--------|--------------|------|------|-------------|
| POST   | `/auth/register` | ❌ | `{email, phone, password, first_name, last_name}` | Register new user |
| POST   | `/auth/login`    | ❌ | `{email/phone, password}` | Login, returns tokens |
| POST   | `/auth/refresh`  | ❌ | `{refreshToken}` | Rotate tokens |
| POST   | `/auth/logout`   | ✅ | `{refreshToken}` | Revoke session |
| GET    | `/auth/me`       | ✅ | — | Get current user |

---

### 📰 Brands — `/brands`

| Method | Endpoint      | Role | Description |
|--------|---------------|------|-------------|
| GET    | `/brands`     | Any  | List all magazine brands |
| POST   | `/brands`     | ADMIN | Create brand |
| GET    | `/brands/:id` | Any  | Get brand by ID |
| PUT    | `/brands/:id` | ADMIN | Update brand |
| DELETE | `/brands/:id` | SUPER_ADMIN | Archive brand |

---

### 📋 Templates — `/templates`

| Method | Endpoint         | Role | Description |
|--------|------------------|------|-------------|
| GET    | `/templates`     | Any  | List section templates |
| GET    | `/templates/:id` | Any  | Get template details |
| POST   | `/templates`     | ADMIN | Create template |
| PUT    | `/templates/:id` | ADMIN | Update template |
| PATCH  | `/templates/:id/slots/reorder` | ADMIN | Sort template slots with `{ slots: [{ key, order }] }` |
| DELETE | `/templates/:id` | ADMIN | Delete template |

---

### 📖 Editions — `/editions`

| Method | Endpoint                          | Role | Description |
|--------|-----------------------------------|------|-------------|
| GET    | `/editions`                       | Any  | List editions (filterable) |
| POST   | `/editions`                       | ADMIN | Create edition for a month |
| GET    | `/editions/:id`                   | ADMIN | Edition details |
| PUT/PATCH | `/editions/:id`                | ADMIN | Update edition metadata |
| POST   | `/editions/:id/publish`           | ADMIN | Publish edition |
| POST   | `/editions/:id/unpublish`         | ADMIN | Un-publish edition |
| GET    | `/editions/:id/sections`          | Any  | Get section list |
| POST   | `/editions/:id/sections`          | AUTHOR | Manually create a section |
| PATCH  | `/editions/:id/sections/:sectionId` | AUTHOR | Update section inline |
| DELETE | `/editions/:id/sections/:sectionId` | ADMIN | Delete section |
| POST   | `/editions/:id/sections/generate`  | ADMIN | Re-generate sections from template |

---

### ✍️ Sections — `/sections`

| Method | Endpoint                        | Role | Description |
|--------|---------------------------------|------|-------------|
| GET    | `/sections/:id`                 | Any  | Get section details |
| PUT/PATCH | `/sections/:id`              | AUTHOR | Update section content |
| POST   | `/sections/:id/submit-review`   | AUTHOR | Submit for Admin review |
| POST   | `/sections/:id/approve`         | ADMIN | Approve section |
| POST   | `/sections/:id/reject`          | ADMIN | Reject section (back to draft) |
| POST   | `/sections/:id/audio/generate`  | AUTHOR | Generate TTS audio (ElevenLabs) |
| POST   | `/sections/:id/audio/regenerate`| AUTHOR | Force regenerate audio |
| DELETE | `/sections/:id/audio`           | AUTHOR | Delete audio |

---

### 👁 Reader — `/reader`

| Method | Endpoint                        | Auth | Description |
|--------|---------------------------------|------|-------------|
| GET    | `/reader/editions`              | ✅  | Browse published editions |
| GET    | `/reader/editions/:id/sections` | ✅  | Read edition (subscription required) |

**Query params for `/reader/editions`:**
- `brandSlug` — filter by magazine
- `language` — default `en`
- `page`, `limit` — pagination

---

### 📎 Allocations — `/allocations`

| Method | Endpoint          | Role | Description |
|--------|-------------------|------|-------------|
| POST   | `/allocations`    | ADMIN | Assign author to edition |
| GET    | `/allocations`    | Any  | List allocations (filter by `editionId`) |
| DELETE | `/allocations/:id`| ADMIN | Revoke allocation |

---

### 💳 Subscriptions — `/subscriptions`

| Method | Endpoint                      | Role | Description |
|--------|-------------------------------|------|-------------|
| GET    | `/subscriptions/plans`        | Any  | Public plan listing (`?brandId=`) |
| GET    | `/subscriptions/plans/admin`  | ADMIN | Full plan listing |
| GET    | `/subscriptions/me`           | USER | My active subscriptions |
| GET    | `/subscriptions/admin`        | ADMIN | All subscriptions |
| POST   | `/subscriptions/admin/grant`  | ADMIN | Manually grant subscription |
| PUT    | `/subscriptions/admin/:id`    | ADMIN | Edit subscription dates/status |
| DELETE | `/subscriptions/admin/:id`    | ADMIN | Delete subscription |
| POST   | `/subscriptions/subscribe`    | USER | Direct subscribe (bypasses payment) |

---

### 💰 Payments — `/payments`

| Method | Endpoint                   | Auth | Description |
|--------|----------------------------|------|-------------|
| POST   | `/payments/razorpay/order` | USER | Create Razorpay order |
| POST   | `/payments/razorpay/verify`| USER | Verify payment + activate subscription |
| POST   | `/payments/razorpay/webhook`| ❌  | Razorpay webhook (no auth) |
| GET    | `/payments/admin`          | ADMIN | List all payments |

---

### 📁 Upload — `/upload`

| Method | Endpoint        | Role | Body (form-data) | Description |
|--------|-----------------|------|------------------|-------------|
| POST   | `/upload/image` | AUTHOR | `image` (file) | Upload to S3, returns public URL |
| POST   | `/upload/audio` | AUTHOR | `audio` (file) | Upload to S3, returns public URL |
| POST   | `/upload/pdf`   | ADMIN  | `pdf` (file)   | Upload to S3, returns public URL |
| POST   | `/upload/batch` | AUTHOR | `files[]` (up to 10) | Batch upload |

---

### 👨‍💼 Admin Users — `/admin`

| Method | Endpoint                    | Role | Description |
|--------|-----------------------------|------|-------------|
| GET    | `/admin/users`              | ADMIN | List all users |
| POST   | `/admin/users`              | ADMIN | Create user/author/admin |
| GET    | `/admin/users/:id`          | ADMIN | Get user details |
| PUT    | `/admin/users/:id`          | ADMIN | Update user |
| PATCH  | `/admin/users/:id/status`   | ADMIN | Activate/suspend user |
| GET    | `/admin/authors`            | ADMIN | List authors |
| GET    | `/admin/authors/:userId`    | ADMIN | Get author profile |
| PUT    | `/admin/authors/:userId`    | ADMIN | Upsert author profile |
| GET    | `/admin/admins`             | ADMIN | List all admins |
| GET    | `/admin/overview`           | ADMIN | Dashboard stats (users, editions, payments) |

---

## 🏎️ Scaling Architecture

### Redis Caching TTLs

| Data | Cache Key | TTL |
|------|-----------|-----|
| Published editions list | `cache:editions:pub:*` | 15 min |
| Edition sections | `cache:editionSections:{id}` | 1 hour |
| Brand slug→ID | `cache:brandId:{slug}` | 24 hours |
| Subscription status | `cache:sub:{userId}:{brandId}` | 5 min |

### Cache Invalidation
- Triggered automatically when: edition is **published**, **unpublished**, or **updated**
- Flushes: `cache:editions:pub:*` pattern + specific edition key

### Rate Limiting
- `/api/v1/auth/*` — 20 requests / 15 min (brute-force protection)
- `/api/*` (global) — 1000 requests / 15 min (DDoS protection)
- All limits backed by Redis = consistent across all serverless instances

---

## 🔑 Response Format

All endpoints return the same shape:

```json
{
  "success": true,
  "message": "Success",
  "data": { ... }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Edition not found",
  "errors": null
}
```

---

## 📦 Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `USE_REDIS=true` + valid `REDIS_URI`
- [ ] Set `JWT_SECRET` to a strong random value
- [ ] Provide all `AWS_*` credentials
- [ ] Configure `RAZORPAY_*` keys
- [ ] Set your S3 bucket policy to allow public-read for the `images/`, `audio/`, and `sections/audio/` prefixes
- [ ] Add your production domains to `ALLOWED_ORIGINS`
- [ ] Grant IAM user: `AmazonS3FullAccess`
- [ ] Ensure `ELEVENLABS_API_KEY` is set and account has sufficient character credits
