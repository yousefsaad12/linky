const collectAnalytics = require("./collectAnalytics");
const { analyticsQueue } = require("../utils/queueClient");

exports.scheduleAnalytics = (req, res, shortCode) => {
  res.once("finish", () => {
    const analyticsData = collectAnalytics(req);
    analyticsQueue
      .add(
        "click",
        { shortCode, ...analyticsData },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 1000 },
        },
      )
      .catch((err) => console.error("Analytics enqueue failed:", err.message));
  });
};
