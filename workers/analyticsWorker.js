const { Worker } = require("bullmq");
const Click = require("../models/clickModel");
const Url = require("../models/urlModel");

const connection = { url: process.env.REDIS_URL };

const worker = new Worker(
  "analytics",
  async (job) => {
    const { shortCode, ...analyticsData } = job.data;

    await Promise.all([
      Click.create({ shortCode, ...analyticsData }),
      Url.updateOne({ shortCode }, { $inc: { clicks: 1 } }),
    ]);
  },
  { connection },
);
worker.on("completed", (job) => console.log(`✅ Job ${job.id} done`));
worker.on("failed", (job, err) =>
  console.error(`❌ Job ${job.id} failed:`, err.message),
);

module.exports = worker;
