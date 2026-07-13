# lnqo API


[<video src="https://github.com/yousefsaad12/linky/issues/6#issue-4869423634" controls width="600"></video>](https://github.com/user-attachments/assets/a73b3c17-7daa-43e8-95ed-37b33ac7b5ca)
Developer-first URL shortening and click analytics API built with Express, MongoDB, Redis, BullMQ, Google OAuth, and API-key access.

This repository is the backend for the companion Next.js app in `D:\URL Frontend`.

## What It Does

- Creates short links from authenticated user accounts.
- Redirects public short codes from `/:shortCode`.
- Caches redirect lookups in Redis.
- Records click analytics asynchronously with BullMQ.
- Stores device, browser, OS, region, city, referrer, and timestamp metadata.
- Provides dashboard analytics endpoints for overview KPIs, timelines, top links, link tables, recent clicks, and per-link details.
- Supports Google OAuth browser login and Pro-plan API keys.
- Enforces per-user link ownership and plan-based feature gates.

## Tech Stack

- Node.js + Express 5
- MongoDB + Mongoose
- Redis for redirect caching
- BullMQ + ioredis for background analytics jobs
- Passport Google OAuth
- JWT cookies for dashboard auth
- Hashed API keys for programmatic access
- Helmet, CORS, rate limiting, URL validation, Mongo query sanitizing

## Project Structure

```text
URLShortener/
  app.js                         Express app, middleware, routes
  server.js                      Mongo/Redis startup and HTTP listener
  benchmark.js                   Autocannon redirect benchmark
  seed.js                        Bulk seed script for benchmark data
  config/
    passport.js                  Google OAuth strategy
    plans.js                     Free/Pro limits and feature flags
  controllers/
    authController.js            OAuth callback, session, API-key auth protection
    urlController.js             Create/list/delete URLs and public redirects
    analyticsController.js       Dashboard analytics endpoints
    apiKeyController.js          Create/list/revoke API keys
  routes/
    authRoutes.js
    urlRoutes.js
    analyticsRoutes.js
  models/
    userModel.js
    urlModel.js
    clickModel.js
    apiKeyModel.js
    counterModel.js
  middlewares/
    checkPlan.js                 Plan, feature, quota, auth-method guards
    validateUrl.js
    rateLimit.js
    mongoSanitize.js
    errorMiddleware.js
  utils/
    analyticsAggregations.js
    apiKeyUtils.js
    base62.js
    bullConnection.js
    collectAnalytics.js
    parsePeriod.js
    planUtils.js
    queueClient.js
    redisClient.js
    scheduleAnalytics.js
    userScope.js
  workers/
    worker.js                    BullMQ click analytics worker
```

## Requirements

- Node.js 18+
- MongoDB connection string
- Redis connection string
- Google OAuth app credentials

## Environment Variables

Create `.env` in this backend directory. The current code reads these variables:

```env
NODE_ENV=development
PORT=3000

DATABASE_LOCAL=mongodb://127.0.0.1:27017/lnqo
DATABASE=mongodb+srv://USER:<PASSWORD>@cluster.example.mongodb.net/lnqo
DATABASE_PASSWORD=your_atlas_password

REDIS_URL=redis://127.0.0.1:6379
REDIS_TTL_SECONDS=3600
ANALYTICS_WORKER_CONCURRENCY=10

BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1h

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/v1/auth/google/callback
```

Notes:

- In production, `getMongoUri()` expects `DATABASE` and `DATABASE_PASSWORD`.
- In development, it expects `DATABASE_LOCAL`.
- `BASE_URL` is used to build returned short URLs.
- `FRONTEND_URL` is where the OAuth callback redirects after login.
- `REDIS_URL` is used by both cache helpers and BullMQ.

## Install

```bash
npm install
```

## Run

Development:

```bash
npm run start:dev
```

Production:

```bash
npm run start:prod
```

The server connects to MongoDB, attempts Redis, starts the BullMQ analytics worker, and listens on `PORT` or `3000`.

## Docker

`docker-compose.yml` provides MongoDB and Redis services.

```bash
docker-compose up -d
npm install
npm run start:dev
```

## Authentication

### Browser OAuth

Start Google OAuth:

```http
GET /api/v1/auth/google
```

Callback:

```http
GET /api/v1/auth/google/callback
```

On success, the backend sets an HTTP-only `jwt` cookie and redirects to `FRONTEND_URL`.

Session profile:

```http
GET /api/v1/auth/me
```

Logout:

```http
POST /api/v1/auth/logout
```

### API Keys

API keys are available only for Pro users and are managed from a cookie-authenticated dashboard session.

```http
GET    /api/v1/auth/api-keys
POST   /api/v1/auth/api-keys
DELETE /api/v1/auth/api-keys/:id
```

Use generated keys with:

```http
Authorization: Bearer lnqo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Keys are stored as SHA-256 hashes in MongoDB and only shown once at creation.

## URL Endpoints

### Create Short URL

```http
POST /api/v1/url
```

Requires cookie auth or a valid Pro API key.

Request:

```json
{
  "originalUrl": "https://example.com/a/very/long/path"
}
```

Response:

```json
{
  "status": "success",
  "data": {
    "url": {
      "_id": "65a1b2c3d4e5f6789012345",
      "shortCode": "1A",
      "originalUrl": "https://example.com/a/very/long/path",
      "clicks": 0,
      "user": "65a1b2c3d4e5f6789012344",
      "createdAt": "2026-06-10T10:00:00.000Z",
      "updatedAt": "2026-06-10T10:00:00.000Z"
    },
    "shortUrl": "http://localhost:3000/1A"
  }
}
```

### List Current User URLs

```http
GET /api/v1/url
```

Requires auth. Returns URLs owned by the current user.

### Delete URL

```http
DELETE /api/v1/url/:shortCode
```

Requires auth and ownership. Deletes the URL, its click rows, and the Redis cache entry.

### Redirect

```http
GET /:shortCode
```

Public. Looks up the original URL, caches it, schedules analytics after the response finishes, then returns a `302` redirect.

## Analytics Endpoints

All analytics endpoints require auth and are scoped to the current user's links.

```http
GET /api/v1/analytics/overview
GET /api/v1/analytics/top-links
GET /api/v1/analytics/links
GET /api/v1/analytics/recent-clicks
GET /api/v1/analytics/links/:shortCode
```

Supported periods are `24h`, `7d`, `30d`, `90d`, and `all`. Free and Pro accounts are clamped by plan history limits from `config/plans.js`.

See [ANALYTICS-API.md](./ANALYTICS-API.md) for full response shapes and examples.

## Plans

Plans are defined in `config/plans.js`.

| Plan | Link limit | Click history | API access | City analytics |
| ---- | ---------- | ------------- | ---------- | -------------- |
| free | 100        | 30 days       | no         | no             |
| pro  | unlimited  | 365 days      | yes        | yes            |

`middlewares/checkPlan.js` enforces quotas, feature access, and cookie-only API-key management.

## Analytics Pipeline

1. User visits `/:shortCode`.
2. `urlController.getOriginalUrl` resolves the destination from Redis or MongoDB.
3. The response redirects immediately.
4. `scheduleAnalytics` enqueues a BullMQ job after the response finishes.
5. `workers/worker.js` writes a `Click` document and increments `Url.clicks`.
6. Dashboard endpoints aggregate the `Click` collection and join URL metadata where needed.

## Database Notes

Important indexes:

- `Url.shortCode` unique
- `Url.user + createdAt`
- `Url.createdAt` TTL, five years
- `Click.shortCode + clickedAt`
- `Click.jobId` unique sparse
- `Click.clickedAt` TTL, five years
- `ApiKey.keyHash` unique
- `ApiKey.user + revokedAt`

## Seeding and Benchmarking

Seed benchmark data:

```bash
node seed.js
```

Run redirect benchmark:

```bash
node benchmark.js
```

Optional custom duration:

```bash
$env:DURATION=120
node benchmark.js
```

## Performance Benchmarks

Benchmarks were executed on a local machine with Redis cache enabled and 500 pre-loaded URLs. Tests simulate read-heavy redirect workloads using Autocannon.

### Summary

| Load level | Connections | Avg throughput | Latency p50 | Latency p99 | Total requests |
| ---------- | ----------- | -------------- | ----------- | ----------- | -------------- |
| Warm-up | 5 | 942 req/s | 4 ms | 9 ms | 5,000 |
| Light | 10 | 1,797 req/s | 5 ms | 8 ms | 107,851 |
| Moderate | 50 | 2,584 req/s | 18 ms | 25 ms | 155,050 |
| High | 100 | 2,752 req/s | 36 ms | 45 ms | 165,079 |
| Stress | 200 | 2,782 req/s | 71 ms | 91 ms | 166,906 |
| Peak | 500 | 2,770 req/s | 154 ms | 283 ms | 166,223 |

### Key Insights

- Peak throughput: about **2,800 req/s** sustained across 500 concurrent connections.
- Sub-10ms latency at light load, with p99 at 8 ms.
- Throughput plateaus around **2.7k req/s**, which is consistent with a Redis-backed redirect path reaching its local saturation point.
- Zero errors across all test scenarios, with 0.0% non-2xx responses.
- Warm Redis cache significantly reduces redirect latency.
- The API degrades predictably under extreme local load, reaching 500 concurrent connections while still serving redirects.

### Detailed Results

#### Warm-up: 5 connections, 5s

```text
Latency: p50=4ms, p99=9ms, max=30ms
Throughput: 942 req/s avg
Total: 5,000 requests in 5.01s, 2.16 MB read
```

#### Light Load: 10 connections, 60s

```text
Latency: p50=5ms, p99=8ms, max=19ms
Throughput: 1,797 req/s avg
Total: 107,851 requests in 60.11s, 49.5 MB read
Error rate: 0.0%
```

#### Moderate Load: 50 connections, 60s

```text
Latency: p50=18ms, p99=25ms, max=35ms
Throughput: 2,584 req/s avg
Total: 155,050 requests in 60.26s, 71.1 MB read
Error rate: 0.0%
```

#### High Load: 100 connections, 60s

```text
Latency: p50=36ms, p99=45ms, max=61ms
Throughput: 2,752 req/s avg
Total: 165,079 requests in 60.3s, 75.7 MB read
Error rate: 0.0%
```

#### Stress Load: 200 connections, 60s

```text
Latency: p50=71ms, p99=91ms, max=106ms
Throughput: 2,782 req/s avg
Total: 166,906 requests in 60.33s, 76.5 MB read
Error rate: 0.0%
```

#### Peak Load: 500 connections, 60s

```text
Latency: p50=154ms, p99=283ms, max=329ms
Throughput: 2,770 req/s avg
Total: 166,223 requests in 60.39s, 76.2 MB read
Error rate: 0.0%
```

Run the benchmark locally with:

```bash
node seed.js
node benchmark.js
```

## Error Handling

Async controllers use `utils/catchAsync.js`. Operational errors use `utils/appError.js`. `middlewares/errorMiddleware.js` maps common Mongoose and JWT errors through `errors/errorMap.js`.

Development responses include stack traces. Production responses hide unexpected internal errors.

## Security Notes

- `.env` is ignored by git; do not commit secrets.
- Cookies are HTTP-only, secure, `sameSite: "none"`.
- CORS currently allows `http://localhost:3000` and `https://lnqo.vercel.app` in `app.js`.
- Request bodies are limited to `10kb`.
- URL creation validates HTTP/HTTPS URLs and max length.
- API keys are hashed before storage.
- Remove debug auth logging before production hardening.

## Related Frontend

The frontend project (`D:\URL Frontend`) is a Next.js app with:

- Landing page
- Dashboard
- Link table and detail pages
- Live click feed
- Link comparison
- API key management
- Profile and quota views
- API docs UI

Set the frontend `NEXT_PUBLIC_API_URL` to this backend origin.

## License

ISC
