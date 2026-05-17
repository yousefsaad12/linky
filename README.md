# 🔗 Linky

**Developer-first link analytics** — a high-performance URL shortener API built with **Express**, **MongoDB**, **Redis**, and **BullMQ**. Fast redirects, rich click tracking, and a dashboard-ready analytics API.

Companion landing UI: **URL Frontend** (Next.js).

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Setup](#-environment-setup)
- [Running the Application](#-running-the-application)
- [API Endpoints](#-api-endpoints)
- [Analytics API (Dashboard)](#-analytics-api-dashboard)
- [Performance Benchmarks](#-performance-benchmarks)
- [Project Structure](#-project-structure)
- [Docker Deployment](#-docker-deployment)
- [Development](#-development)

---

## ✨ Features

- **Fast Short URL Generation** — Sequential counter with base62 encoding
- **HTTP Redirect Service** — Seamless redirection with 302 status code
- **Redis Caching** — Smart caching layer for frequently accessed URLs
- **Analytics Tracking** — Collects device, browser, OS, geo-location, and referrer data
- **Asynchronous Processing** — BullMQ worker queue handles analytics jobs with retry logic
- **Auto-Expiration** — MongoDB TTL indexes clean up old data automatically
- **Job Deduplication** — Prevents duplicate analytics records via unique job IDs
- **Scalable Architecture** — Modular design with separated concerns
- **Error Handling** — Centralized error middleware with consistent responses
- **Production Ready** — Configurable concurrency, connection pooling, graceful startup

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
│  (Postman)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Express Server (Port 3000)        │
│  ├─ GET  /api/v1/url/:shortCode    │ ◄─── Redis Cache
│  ├─ POST /api/v1/url                │
│  └─ DELETE /api/v1/url/:shortCode   │
└──────────┬──────────────────────────┘
           │
           ├─────────► MongoDB (URL Data)
           │
           └─────────► Redis Queue (BullMQ)
                         │
                         ▼
                    Analytics Worker
                    (Background Job)
                         │
                         ▼
                    MongoDB (Clicks Collection)
```

---

## 🛠️ Tech Stack

| Component          | Technology   | Version   |
| ------------------ | ------------ | --------- |
| **Runtime**        | Node.js      | LTS       |
| **Framework**      | Express.js   | ^5.2.1    |
| **Database**       | MongoDB      | ^9.3.0    |
| **Cache**          | Redis        | ^5.12.1   |
| **Queue**          | BullMQ       | ^5.76.6   |
| **URL Validation** | Validator.js | ^13.15.26 |
| **Geo-IP**         | geoip-lite   | ^1.4.10   |
| **User-Agent**     | ua-parser-js | ^2.0.9    |
| **Dev Tools**      | Nodemon      | ^3.1.14   |
| **Benchmarking**   | Autocannon   | ^8.0.0    |

---

## 📋 Prerequisites

- **Node.js** v18+
- **MongoDB** (local or Atlas)
- **Redis** v6+ (for caching and queue)
- **Docker** & **Docker Compose** (optional)

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/url-shortener.git
cd URLShortener
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create `.env` file

```bash
cp .env.example .env
```

Edit `.env` with your configuration (see [Environment Setup](#-environment-setup)).

---



## 🏃 Running the Application

### Development Mode

Run the server with hot reload:

```bash
npm run start:dev
```

Expected output:

```
✅ DB connected!
✅ Redis connected!
✅ Analytics queue ready
✅ Analytics worker ready
🚀 App running on port 3000 [development]
```

### Production Mode

```bash
npm run start:prod
```

### Run with Docker Compose

```bash
docker-compose up
```

---

## 📡 API Endpoints

### 1. Create Short URL

**Request:**

```bash
curl -X POST http://localhost:3000/api/v1/url \
  -H "Content-Type: application/json" \
  --cookie "jwt=YOUR_JWT_HERE" \
  -d '{"originalUrl": "https://www.example.com/very/long/url"}'
```

Requires authentication (same `jwt` cookie as analytics).

**Response:**

```json
{
  "status": "success",
  "data": {
    "url": {
      "_id": "507f1f77bcf86cd799439011",
      "shortCode": "abc123",
      "originalUrl": "https://www.example.com/very/long/url",
      "clicks": 0,
      "createdAt": "2026-05-12T10:30:00Z"
    },
    "shortUrl": "https://your-domain.com/abc123"
  }
}
```

### 2. Redirect to Original URL

**Request:**

```bash
curl -L http://localhost:3000/api/v1/url/abc123
```

**Response:** HTTP 302 redirect to original URL + analytics job enqueued

### 3. Get All URLs

**Request:**

```bash
curl http://localhost:3000/api/v1/url
```

**Response:**

```json
{
  "status": "success",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "shortCode": "abc123",
      "originalUrl": "https://www.example.com/very/long/url",
      "clicks": 42,
      "createdAt": "2026-05-12T10:30:00Z"
    }
  ]
}
```

### Analytics API (Dashboard)

Protected endpoints for dashboards (charts, KPIs, top links, activity feed). Full documentation with examples and response fields:

**[ANALYTICS-API.md](./ANALYTICS-API.md)**

Base path: `/api/v1/analytics` (requires `jwt` cookie after Google login).

| Endpoint | Description |
|----------|-------------|
| `GET /overview` | Dashboard KPIs, timeline, top links, breakdowns |
| `GET /top-links` | Ranked links for a time period |
| `GET /links` | Paginated links table |
| `GET /recent-clicks` | Latest click events |
| `GET /links/:shortCode` | Per-link analytics and charts |

---

### 4. Delete Short URL

**Request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/url/abc123
```

**Response:** HTTP 204 No Content

---

## 📊 Performance Benchmarks

Benchmarks executed on local machine with **Redis cache enabled** and **500 pre-loaded URLs**. Tests simulate read-heavy workloads using **Autocannon**.

### Summary

| Load Level   | Connections | Avg Throughput  | Latency (p50) | Latency (p99) | Total Requests |
| ------------ | ----------- | --------------- | ------------- | ------------- | -------------- |
| **Warm-up**  | 5           | 942 req/s       | 4ms           | 9ms           | 5k             |
| **Light**    | 10          | **1,797 req/s** | 5ms           | 8ms           | 107,851        |
| **Moderate** | 50          | **2,584 req/s** | 18ms          | 25ms          | 155,050        |
| **High**     | 100         | **2,752 req/s** | 36ms          | 45ms          | 165,079        |
| **Stress**   | 200         | **2,782 req/s** | 71ms          | 91ms          | 166,906        |
| **Peak**     | 500         | **2,770 req/s** | 154ms         | 283ms         | 166,223        |

### Key Insights

- **Peak throughput**: ~2,800 req/s sustained across 500 concurrent connections
- **Sub-10ms latency** at light loads (p99: 8ms)
- **Consistent performance**: Throughput plateaus at ~2.7k req/s (Redis cache saturation point)
- **Zero errors** across all test scenarios (0% non-2xx responses)
- **Efficient caching**: Warm cache reduces latency significantly
- **Scalable**: Graceful degradation under extreme load (500 concurrent connections)

### Detailed Results

#### Warm-up (5 connections, 5s)

```
Latency: p50=4ms, p99=9ms, max=30ms
Throughput: 942 req/s (avg)
Total: 5,000 requests in 5.01s (2.16 MB read)
```

#### Light Load (10 connections, 60s)

```
Latency: p50=5ms, p99=8ms, max=19ms
Throughput: 1,797 req/s (avg)
Total: 107,851 requests in 60.11s (49.5 MB read)
Error Rate: 0.0%
```

#### Moderate Load (50 connections, 60s)

```
Latency: p50=18ms, p99=25ms, max=35ms
Throughput: 2,584 req/s (avg)
Total: 155,050 requests in 60.26s (71.1 MB read)
Error Rate: 0.0%
```

#### High Load (100 connections, 60s)

```
Latency: p50=36ms, p99=45ms, max=61ms
Throughput: 2,752 req/s (avg)
Total: 165,079 requests in 60.3s (75.7 MB read)
Error Rate: 0.0%
```

#### Stress Load (200 connections, 60s)

```
Latency: p50=71ms, p99=91ms, max=106ms
Throughput: 2,782 req/s (avg)
Total: 166,906 requests in 60.33s (76.5 MB read)
Error Rate: 0.0%
```

#### Peak Load (500 connections, 60s)

```
Latency: p50=154ms, p99=283ms, max=329ms
Throughput: 2,770 req/s (avg)
Total: 166,223 requests in 60.39s (76.2 MB read)
Error Rate: 0.0%
```

---

## 📁 Project Structure

```
URLShortener/
├── app.js                          # Express app setup
├── server.js                       # Server entry point
├── benchmark.js                    # Performance benchmarking script
├── package.json                    # Dependencies
├── docker-compose.yml              # Docker orchestration
├── .env                            # Environment variables (not in git)
├── .env.example                    # Environment template
│
├── controllers/
│   └── urlController.js            # Request handlers
│
├── models/
│   ├── urlModel.js                 # URL data model (TTL 5 years)
│   ├── clickModel.js               # Click analytics model (TTL 5 years)
│   └── counterModel.js             # Sequential counter for encoding
│
├── routes/
│   └── urlRoutes.js                # API route definitions
│
├── middlewares/
│   ├── validateUrl.js              # URL validation (HTTP/HTTPS)
│   ├── rateLimit.js                # Rate limiting middleware
│   └── errorMiddleware.js          # Global error handler
│
├── errors/
│   └── errorHandler.js             # Database error formatting
│
├── utils/
│   ├── AppError.js                 # Custom error class
│   ├── base62.js                   # Base62 encoding for short codes
│   ├── catchAsync.js               # Async error wrapper
│   ├── collectAnalytics.js         # Analytics data collection
│   ├── dbUri.js                    # Database connection builder
│   ├── bullConnection.js           # BullMQ connection config
│   ├── queueClient.js              # Analytics queue setup
│   ├── redisClient.js              # Redis cache client
│   ├── scheduleAnalytics.js        # Job scheduler
│   └── time.js                     # Time utilities (TTL helpers)
│
└── workers/
    └── worker.js                   # BullMQ worker for analytics
```

---

## 🐳 Docker Deployment

### Using Docker Compose

**Includes**: MongoDB, Redis cache, Redis queue

```bash
docker-compose up -d
npm install
npm run start:prod
```

### Manual Docker Build

```bash
docker build -t url-shortener .
docker run -p 3000:3000 --env-file .env url-shortener
```

---

## 🔧 Development

### Running Tests

```bash
npm test
```

### Running Benchmarks

```bash
npm run benchmark
```

Or with custom duration:

```bash
DURATION=120 npm run benchmark
```

### Code Structure

- **MVC Pattern**: Models, Controllers, Routes
- **Error Handling**: Centralized with `catchAsync` wrapper
- **Async Jobs**: BullMQ for background analytics
- **Caching Strategy**: Redis with 1-hour TTL (configurable)
- **Data Persistence**: MongoDB with auto-expiration

---

## 🔐 Security Notes

⚠️ **Important**: Before deploying to production:

1. **Never commit `.env`** — Add to `.gitignore`
2. **Rotate credentials** — Change MongoDB/Redis passwords
3. **Enable CORS** — Restrict cross-origin requests if needed
4. **Implement rate limiting** — Currently set to 1M (needs tuning)
5. **Authentication** — URL create/list/delete require login; redirects stay public
6. **Use HTTPS** — Always in production
7. **Monitor logs** — Set up centralized logging

---

## 🚦 Health Checks

Basic endpoint availability:

```bash
curl http://localhost:3000/api/v1/url
```

Expected response:

- **200 OK** if service is up
- **500 Error** if MongoDB or Redis unavailable

---

## 📈 Scaling Considerations

- **Horizontal**: Add more Express instances behind a load balancer
- **Database**: Use MongoDB Atlas auto-scaling
- **Cache**: Redis Cluster for distributed caching
- **Queue**: Multiple worker instances consuming from BullMQ
- **CDN**: Cache redirect responses for geographically distributed traffic

---

## 🛣️ Roadmap

- [x] User authentication (Google OAuth) and per-user URL ownership
- [ ] Custom short codes
- [ ] URL expiration dates
- [ ] QR code generation
- [ ] Real-time analytics dashboard
- [ ] API key management
- [ ] Batch URL creation
- [ ] Custom domain support
- [ ] Link preview metadata extraction

---

## 📄 License

ISC

---

## 👤 Author

**Your Name**  
GitHub: [@yousefsaad12](https://github.com/yousefsaad12)

---

## 📞 Support

For issues, questions, or suggestions:

- Open an issue on GitHub
- Email: ysaad.dev@gmail.com

---

**Last Updated**: May 12, 2026
