const { Queue } = require("bullmq");
const connection = { url: process.env.REDIS_URL };

const analyticsQueue = new Queue("analytics", { connection });

module.exports = analyticsQueue;