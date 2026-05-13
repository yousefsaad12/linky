const { Worker } = require("bullmq");
const Click = require("../models/clickModel");
const Url = require("../models/urlModel");
const { bullConnection } = require("../utils/bullConnection");

const workerConcurrency = Math.max(
  1,
  Math.min(100, Number(process.env.ANALYTICS_WORKER_CONCURRENCY) || 10),
);

let processedJobs = 0;

const worker = new Worker(
  "analytics",
  async (job) => {
    const { shortCode, ...analyticsData } = job.data || {};
    if (!shortCode || typeof shortCode !== "string") {
      throw new Error("Invalid job: missing shortCode");
    }

    const jobId = String(job.id);
    const jobNumber = ++processedJobs;
    console.log(
      `✅ Processing analytics job #${jobNumber} — id=${jobId} shortCode=${shortCode}`,
    );

    try {
      await Click.create({
        shortCode,
        ...analyticsData,
        jobId,
      });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }

    await Url.updateOne({ shortCode }, { $inc: { clicks: 1 } });
  },
  { connection: bullConnection, concurrency: workerConcurrency },
);

worker.on("ready", () => console.log("✅ Analytics worker ready"));

worker.on("failed", (job, err) =>
  console.error("Analytics job failed:", err.message),
);

module.exports = worker;
