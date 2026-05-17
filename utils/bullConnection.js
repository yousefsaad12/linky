const IORedis = require("ioredis");

const bullConnection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false, // fixes NOAUTH on info command
  
});

bullConnection.on("connect", () => {
  console.log("✅ BullMQ Redis connected");
});

bullConnection.on("error", (err) => {
  console.error("❌ BullMQ Redis error:", err.message);
});

module.exports = { bullConnection };
