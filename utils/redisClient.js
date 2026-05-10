const { createClient } = require("redis");
const AppError = require("./AppError");

let client = null;

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;

  if (!client) {
    client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (n) => n >= 10 ? new Error("Max retries") : Math.min(n * 100, 3000),
      },
    });
    client.on("error", (err) => console.error("[Redis]", err.message));
    await client.connect();
  }

  return client.isOpen ? client : null;
}

async function assertRedisReady() {
  if (!(await getRedisClient())) throw new AppError("Redis unavailable", 500);
  console.log("✅ Redis connected!");
}

const getCacheTtlSeconds = () => {
  const ttl = Number(process.env.REDIS_TTL_SECONDS);
  return Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 86400;
};

const urlCacheKey = (shortCode) => `url:${shortCode}`;

module.exports = { getRedisClient, assertRedisReady, getCacheTtlSeconds, urlCacheKey };