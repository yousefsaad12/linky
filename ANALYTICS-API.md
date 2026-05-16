# Analytics API

Dashboard-oriented endpoints that read from the **`Click`** collection (device, browser, OS, geo, referrer, timestamps) and the **`Url`** collection (link metadata and total click counts).

All analytics routes live under:

```
/api/v1/analytics
```

They are **protected**: you must be logged in (JWT in the `jwt` HTTP-only cookie set after Google OAuth). Unauthenticated requests receive `401 Not authenticated`.

All metrics are **scoped to your account**: only clicks on short URLs you created (where `Url.user` matches your user id) are included. Legacy links without an owner are excluded.

---

## Table of contents

- [How it fits together](#how-it-fits-together)
- [Authentication](#authentication)
- [Shared query parameters](#shared-query-parameters)
- [Endpoints](#endpoints)
  - [GET /overview](#get-overview)
  - [GET /top-links](#get-top-links)
  - [GET /links](#get-links)
  - [GET /recent-clicks](#get-recent-clicks)
  - [GET /links/:shortCode](#get-linksshortcode)
- [Response shapes](#response-shapes)
- [Errors](#errors)
- [Project files](#project-files)
- [Dashboard UI mapping](#dashboard-ui-mapping)

---

## How it fits together

When someone visits a short link (`GET /api/v1/url/:shortCode`), the server redirects immediately and enqueues an analytics job (BullMQ). A background worker writes a **`Click`** document and increments **`Url.clicks`**.

The analytics API **does not** record clicks. It only **reads** stored data and runs MongoDB aggregations so a frontend can render charts and tables without loading raw click rows.

```
Redirect  →  BullMQ job  →  Click document + Url.clicks++
                                    ↑
                         Analytics API reads this
```

**Two sources of “click count”:**

| Source | Meaning |
|--------|---------|
| `Url.clicks` | Lifetime total on the link document (fast, denormalized) |
| `Click` collection | Every individual click with metadata; used for periods, charts, and breakdowns |

For a selected **period** (e.g. `7d`), counts and charts use **`Click`** rows where `clickedAt` is within that window. Lifetime totals on a link use **`Url.clicks`**.

---

## Authentication

1. Sign in via Google: `GET /api/v1/auth/google` (browser flow).
2. After callback, the server sets a `jwt` cookie (`authController.googleCallback`).
3. Call analytics endpoints from the same browser session, or forward the `jwt` cookie in API tools.

Example with cookie (replace with your token if testing manually):

```bash
curl "http://localhost:3000/api/v1/analytics/overview" \
  --cookie "jwt=YOUR_JWT_HERE"
```

Logout: `POST /api/v1/auth/logout` (clears the cookie).

---

## Shared query parameters

Used on several endpoints.

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `period` | `24h`, `7d`, `30d`, `90d`, `all` | `30d` | Time window for aggregations. Invalid values fall back to `30d`. |
| `limit` | `1`–`50` (overview/top) or `1`–`100` (recent/links table) | Varies per endpoint | Max items returned. Values are clamped server-side. |
| `granularity` | `hour`, `day` | `day` (or `hour` when `period=24h` on per-link) | Bucket size for timeline charts. |

**Period behavior** (`utils/parsePeriod.js`):

- `24h` — last 24 hours  
- `7d` — last 7 days  
- `30d` — last 30 days  
- `90d` — last 90 days  
- `all` — no `clickedAt` filter (entire click history)

The API returns the resolved `period` string in the JSON so the UI can show the active filter.

---

## Endpoints

### GET `/overview`

**Path:** `GET /api/v1/analytics/overview`

**Purpose:** Main dashboard page — KPIs, click trend, top links, and global breakdowns in one request.

**Query**

| Param | Default | Notes |
|-------|---------|-------|
| `period` | `30d` | Filters timeline, breakdowns, `clicksInPeriod`, `activeLinksInPeriod`, `topLinks` |
| `limit` | `5` | Number of entries in `topLinks` (max 50) |

**Summary fields**

| Field | Description |
|-------|-------------|
| `totalUrls` | Count of your short URLs |
| `totalClicks` | Count of click documents on your links (all time) |
| `clicksInPeriod` | Clicks in the selected `period` (equals `totalClicks` when `period=all`) |
| `clicksToday` | Clicks in the last 24 hours (fixed window, not tied to `period`) |
| `clicksLast7d` | Clicks in the last 7 days (fixed) |
| `clicksLast30d` | Clicks in the last 30 days (fixed) |
| `activeLinksInPeriod` | Distinct `shortCode` values with at least one click in `period`; for `all`, URLs with `clicks > 0` |

**Other response sections**

- `timeline` — `[{ date, clicks }]` buckets (`hour` if `period=24h`, else `day`)
- `topLinks` — highest-traffic links in the period (see [Top link object](#top-link-object))
- `breakdowns` — `deviceTypes`, `browsers`, `referrers` (top 15), `regions` — each `[{ name, count }]`

**Example**

```bash
curl "http://localhost:3000/api/v1/analytics/overview?period=7d&limit=10" \
  --cookie "jwt=YOUR_JWT_HERE"
```

**Example response (abbreviated)**

```json
{
  "status": "success",
  "data": {
    "period": "7d",
    "summary": {
      "totalUrls": 120,
      "totalClicks": 5400,
      "clicksInPeriod": 380,
      "clicksToday": 45,
      "clicksLast7d": 380,
      "clicksLast30d": 2100,
      "activeLinksInPeriod": 28
    },
    "timeline": [
      { "date": "2026-05-09", "clicks": 52 },
      { "date": "2026-05-10", "clicks": 61 }
    ],
    "topLinks": [
      {
        "shortCode": "1a2b",
        "clicks": 120,
        "originalUrl": "https://example.com/page",
        "totalClicks": 450,
        "createdAt": "2026-05-01T10:00:00.000Z"
      }
    ],
    "breakdowns": {
      "deviceTypes": [
        { "name": "mobile", "count": 200 },
        { "name": "desktop", "count": 150 }
      ],
      "browsers": [{ "name": "Chrome", "count": 220 }],
      "referrers": [{ "name": "direct", "count": 300 }],
      "regions": [{ "name": "CA", "count": 80 }]
    }
  }
}
```

---

### GET `/top-links`

**Path:** `GET /api/v1/analytics/top-links`

**Purpose:** Ranked list of links by clicks in a period — e.g. “Top 10 this month” widget without loading the full overview payload.

**Query**

| Param | Default | Notes |
|-------|---------|-------|
| `period` | `30d` | |
| `limit` | `10` | Max `50` |

**Example**

```bash
curl "http://localhost:3000/api/v1/analytics/top-links?period=30d&limit=10" \
  --cookie "jwt=YOUR_JWT_HERE"
```

**Response**

```json
{
  "status": "success",
  "results": 10,
  "period": "30d",
  "data": [
    {
      "shortCode": "1a2b",
      "clicks": 120,
      "originalUrl": "https://example.com",
      "totalClicks": 450,
      "createdAt": "2026-05-01T10:00:00.000Z"
    }
  ]
}
```

| Field on each item | Meaning |
|--------------------|---------|
| `clicks` | Clicks **in the selected period** |
| `totalClicks` | Lifetime clicks on the URL document |

---

### GET `/links`

**Path:** `GET /api/v1/analytics/links`

**Purpose:** Paginated table of all short URLs for a “Links” or “Manage URLs” page. Lighter than `GET /api/v1/url` for dashboards because it returns only fields needed for a table and supports pagination/sort.

**Query**

| Param | Default | Notes |
|-------|---------|-------|
| `page` | `1` | 1-based page number |
| `limit` | `20` | Per page, max `100` |
| `sort` | `createdAt` | `clicks` = sort by total clicks descending; anything else = newest first |

**Example**

```bash
curl "http://localhost:3000/api/v1/analytics/links?page=1&limit=20&sort=clicks" \
  --cookie "jwt=YOUR_JWT_HERE"
```

**Response**

```json
{
  "status": "success",
  "page": 1,
  "totalPages": 6,
  "results": 20,
  "total": 120,
  "data": [
    {
      "shortCode": "1a2b",
      "originalUrl": "https://example.com",
      "clicks": 450,
      "createdAt": "2026-05-01T10:00:00.000Z",
      "updatedAt": "2026-05-10T15:30:00.000Z"
    }
  ]
}
```

---

### GET `/recent-clicks`

**Path:** `GET /api/v1/analytics/recent-clicks`

**Purpose:** Live activity feed — latest individual clicks across the app or for one link.

**Query**

| Param | Default | Notes |
|-------|---------|-------|
| `limit` | `20` | Max `100` |
| `shortCode` | *(none)* | If set, only clicks for that short code |

**Example (global feed)**

```bash
curl "http://localhost:3000/api/v1/analytics/recent-clicks?limit=15" \
  --cookie "jwt=YOUR_JWT_HERE"
```

**Example (single link)**

```bash
curl "http://localhost:3000/api/v1/analytics/recent-clicks?shortCode=1a2b&limit=10" \
  --cookie "jwt=YOUR_JWT_HERE"
```

**Click object fields** (from `Click` model)

| Field | Description |
|-------|-------------|
| `shortCode` | Which short link was clicked |
| `os` | Operating system from User-Agent |
| `browser` | Browser name |
| `deviceType` | `mobile`, `tablet`, `desktop`, or `unknown` |
| `region` | Region from GeoIP |
| `city` | City from GeoIP |
| `referrer` | HTTP Referer or `direct` |
| `clickedAt` | When the click was recorded |

Internal fields (`jobId`, `__v`) are omitted from the response.

---

### GET `/links/:shortCode`

**Path:** `GET /api/v1/analytics/links/:shortCode`

**Purpose:** Detail page for one short URL — metadata, period stats, timeline, and full breakdowns (including OS and city).

**Params**

| Param | In | Description |
|-------|-----|-------------|
| `shortCode` | path | The short code (e.g. `1a2b`) |

**Query**

| Param | Default | Notes |
|-------|---------|-------|
| `period` | `30d` | |
| `granularity` | `day` | Use `hour` for finer charts; defaults to `hour` when `period=24h` |

**Example**

```bash
curl "http://localhost:3000/api/v1/analytics/links/1a2b?period=30d&granularity=day" \
  --cookie "jwt=YOUR_JWT_HERE"
```

**Response (abbreviated)**

```json
{
  "status": "success",
  "data": {
    "period": "30d",
    "url": {
      "shortCode": "1a2b",
      "originalUrl": "https://example.com",
      "clicks": 450,
      "createdAt": "2026-05-01T10:00:00.000Z",
      "updatedAt": "2026-05-10T15:30:00.000Z",
      "shortUrl": "http://localhost:3000/1a2b"
    },
    "summary": {
      "totalClicks": 450,
      "clicksInPeriod": 120
    },
    "timeline": [
      { "date": "2026-05-09", "clicks": 12 }
    ],
    "breakdowns": {
      "deviceTypes": [{ "name": "mobile", "count": 70 }],
      "browsers": [{ "name": "Chrome", "count": 90 }],
      "operatingSystems": [{ "name": "Windows", "count": 50 }],
      "referrers": [{ "name": "https://twitter.com", "count": 30 }],
      "regions": [{ "name": "ON", "count": 40 }],
      "cities": [{ "name": "Toronto", "count": 35 }]
    }
  }
}
```

`shortUrl` is built from `BASE_URL` in your environment (trailing slashes stripped).

**404** — `Short URL not found` if `shortCode` does not exist.

---

## Response shapes

### Standard envelope

Successful responses use:

```json
{
  "status": "success",
  "data": { }
}
```

List endpoints may also include `results`, `page`, `totalPages`, `total`, and `period` where relevant.

### Breakdown item

Used in `breakdowns.*` arrays:

```json
{ "name": "Chrome", "count": 220 }
```

Missing or null values are labeled `"unknown"`.

### Timeline item

```json
{ "date": "2026-05-10", "clicks": 61 }
```

Hourly buckets look like: `"2026-05-10T14:00"`.

### Top link object

Returned in `overview.topLinks` and `top-links` data:

| Field | Description |
|-------|-------------|
| `shortCode` | Short code |
| `clicks` | Clicks in the requested period |
| `originalUrl` | Destination URL |
| `totalClicks` | Lifetime clicks on `Url` |
| `createdAt` | When the short URL was created |

---

## Errors

| Status | When |
|--------|------|
| `401` | No `jwt` cookie or invalid/expired token |
| `404` | `GET /links/:shortCode` — unknown `shortCode` |
| `404` | Wrong path (handled by global app 404 handler) |
| `500` | Database or server errors (via global error middleware) |

Error body shape follows the rest of the app (`AppError` / `errorMiddleware`).

---

## Project files

| File | Role |
|------|------|
| `routes/analyticsRoutes.js` | Defines routes; applies `protect` to all of them |
| `controllers/analyticsController.js` | Handlers: overview, top links, table, recent clicks, per-link stats |
| `utils/parsePeriod.js` | Parses `period` query → `{ period, since }` and builds MongoDB `match` filters |
| `utils/analyticsAggregations.js` | Reusable aggregations: `breakdown`, `clicksOverTime`, `topLinksByPeriod` |
| `app.js` | Mounts router at `/api/v1/analytics` |
| `models/clickModel.js` | Source data for analytics (not modified by this API) |
| `models/urlModel.js` | Link metadata, `user` owner, and `clicks` counter |
| `utils/userScope.js` | Builds per-user filters for URLs and click aggregations |

**Aggregation helpers** (`utils/analyticsAggregations.js`):

- **`breakdown(match, field, limit)`** — groups clicks by a field (`deviceType`, `browser`, etc.), sorts by count, returns top N.
- **`clicksOverTime(match, granularity)`** — groups by day or hour using `$dateToString`.
- **`topLinksByPeriod(match, limit)`** — groups by `shortCode`, joins `urls` collection for `originalUrl` and `totalClicks`.

Handlers run independent queries with `Promise.all` where possible to reduce latency.

---

## Dashboard UI mapping

Suggested wiring for a frontend dashboard:

| UI section | Endpoint | Data to use |
|------------|----------|-------------|
| KPI cards (totals, today, 7d, 30d) | `GET /overview` | `data.summary` |
| Main line chart | `GET /overview?period=…` | `data.timeline` |
| Donut / bar charts (device, browser, geo, referrer) | `GET /overview` | `data.breakdowns` |
| “Top links” sidebar | `GET /top-links` or `overview.topLinks` | `data` / `topLinks` |
| Links table with pagination | `GET /links` | `data`, `page`, `totalPages` |
| Activity feed | `GET /recent-clicks` | `data` |
| Single link detail + charts | `GET /links/:shortCode` | `data.url`, `summary`, `timeline`, `breakdowns` |
| Per-link activity | `GET /recent-clicks?shortCode=…` | `data` |

**Period selector:** bind a dropdown to `period` and refetch overview or detail endpoints.

**Compare period vs lifetime on link rows:** show `clicks` (period) vs `totalClicks` (lifetime) from `top-links` or per-link `summary`.

---

## Quick reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/analytics/overview` | Full dashboard snapshot |
| `GET` | `/api/v1/analytics/top-links` | Ranked links for a period |
| `GET` | `/api/v1/analytics/links` | Paginated URL table |
| `GET` | `/api/v1/analytics/recent-clicks` | Latest click events |
| `GET` | `/api/v1/analytics/links/:shortCode` | Analytics for one link |

All require authentication via the `jwt` cookie.
