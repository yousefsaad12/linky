const { Queue } = require("bullmq");

const connection = {
  host: process.env.REDIS_QUEUE_HOST || "localhost",
  port: Number(process.env.REDIS_QUEUE_PORT) || 6380,
};

const analyticsQueue = new Queue("analytics", { connection, defaultJobOptions: {
  removeOnComplete: 100,  // keep only last 100 completed
  removeOnFail: 50,       // keep only last 50 failed
}, });

module.exports = analyticsQueue;