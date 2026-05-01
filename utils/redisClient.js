const { createClient } = require("redis");
const AppError = require("./AppError");

let client;
let connectPromise;

function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL);
}

function assertValidRedisUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
      throw new Error("REDIS_URL must start with redis:// or rediss://");
    }
  } catch (e) {
    throw new AppError(
      `Invalid REDIS_URL configuration: ${e?.message || "unknown error"}`,
      500,
    );
  }
}

async function getRedisClient() {
  if (!isRedisConfigured()) return null;
  assertValidRedisUrl(process.env.REDIS_URL);

  if (!client) {
    client = createClient({ url: process.env.REDIS_URL });
    client.on("error", () => {
      // keep the app running even if redis is down
    });
  }

  if (!connectPromise) {
    connectPromise = client.connect().catch(() => null);
  }

  await connectPromise;
  return client?.isOpen ? client : null;
}

function getCacheTtlSeconds() {
  const raw = process.env.REDIS_TTL_SECONDS;
  const ttl = raw ? Number(raw) : 24 * 60 * 60; // 1 day
  return Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 24 * 60 * 60;
}

function urlCacheKey(shortCode) {
  return `url:${shortCode}`;
}

module.exports = {
  getRedisClient,
  getCacheTtlSeconds,
  urlCacheKey,
};

