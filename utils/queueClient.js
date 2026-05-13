const { Queue } = require("bullmq");
const { bullConnection } = require("./bullConnection");

const analyticsQueue = new Queue("analytics", {
  connection: bullConnection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

console.log("✅ Analytics queue ready");

module.exports = { analyticsQueue };
