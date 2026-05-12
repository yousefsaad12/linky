const { createClient } = require("redis");
const AppError = require("./AppError");

let client = null;
let connecting = null;

async function getRedisClient() {
  if (!process.env.REDIS_CACHE_URL) return null;
  if (client?.isOpen) return client;

  if (!connecting) {
    connecting = (async () => {
      try {
        client = createClient({
          url: process.env.REDIS_CACHE_URL,
          socket: {
            reconnectStrategy: (n) =>
              n >= 10 ? new Error("Max retries") : Math.min(n * 100, 3000),
            connectTimeout: 5000,
          },
          pingInterval: 10000, // keep connection alive under load
        });

        client.on("error", (err) =>
          console.error("[Redis] Error:", err.message),
        );
        client.on("reconnecting", () => console.log("[Redis] Reconnecting..."));

        await client.connect();
      } finally {
        connecting = null;
      }
    })();
  }

  await connecting;
  return client?.isOpen ? client : null;
}

async function assertRedisReady() {
  const c = await getRedisClient();
  if (!c) throw new AppError("Redis unavailable", 500);
  console.log("✅ Redis connected!");
}

const getCacheTtlSeconds = () => {
  const ttl = Number(process.env.REDIS_TTL_SECONDS);
  return Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 3600;
};

const urlCacheKey = (shortCode) => `url:${shortCode}`;

async function getCache(key) {
  try {
    const c = await getRedisClient();
    if (!c) return null;
    const data = await c.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn("[Redis] getCache failed:", err.message);
    return null;
  }
}

async function setCache(key, value) {
  try {
    const c = await getRedisClient();
    if (!c) return;
    await c.set(key, JSON.stringify(value), { EX: getCacheTtlSeconds() });
  } catch (err) {
    console.warn("[Redis] setCache failed:", err.message);
  }
}

async function deleteCache(key) {
  try {
    const c = await getRedisClient();
    if (!c) return;
    await c.del(key);
  } catch (err) {
    console.warn("[Redis] deleteCache failed:", err.message);
  }
}

module.exports = {
  getRedisClient,
  assertRedisReady,
  getCacheTtlSeconds,
  urlCacheKey,
  getCache,
  setCache,
  deleteCache,
};
