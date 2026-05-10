const collectAnalytics = require("./collectAnalytics");
const analyticsQueue = require("../utils/queueClient");
exports.scheduleAnalytics = (req, res, shortCode) => {
  res.once("finish", () => {
    const analyticsData = collectAnalytics(req);
    analyticsQueue.add("click", { shortCode, ...analyticsData });
  });
};
