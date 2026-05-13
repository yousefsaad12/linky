const bullConnection = {
  host: process.env.REDIS_QUEUE_HOST || "localhost",
  port: Number(process.env.REDIS_QUEUE_PORT) || 6380,
};

module.exports = { bullConnection };
