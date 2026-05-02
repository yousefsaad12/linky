const collectAnalytics = require("./collectAnalytics");
const Click = require("./../models/clickModel");
const Url = require("./../models/urlModel");
exports.scheduleAnalytics = (res, req, shortCode) => {
  res.once("finish", () => {
    Url.updateOne({ shortCode }, { $inc: { clicks: 1 } }).catch((err) => {
      console.error("Analytics update failed:", err);
    });

    const analyticsData = collectAnalytics(req);

    Click.create({
      shortCode,
      ...analyticsData,
    }).catch((err) => {
      console.error("Click create failed:", err);
    });
  });
};
