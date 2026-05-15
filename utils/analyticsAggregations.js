const Click = require("../models/clickModel");

const breakdown = (match, field, limit = 10) =>
  Click.aggregate([
    { $match: match },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        name: { $ifNull: ["$_id", "unknown"] },
        count: 1,
      },
    },
  ]);

const clicksOverTime = (match, granularity = "day") => {
  const format = granularity === "hour" ? "%Y-%m-%dT%H:00" : "%Y-%m-%d";

  return Click.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format, date: "$clickedAt" } },
        clicks: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: "$_id", clicks: 1 } },
  ]);
};

const topLinksByPeriod = (match, limit = 10) =>
  Click.aggregate([
    { $match: match },
    { $group: { _id: "$shortCode", clicks: { $sum: 1 } } },
    { $sort: { clicks: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "urls",
        localField: "_id",
        foreignField: "shortCode",
        as: "url",
      },
    },
    { $unwind: { path: "$url", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        shortCode: "$_id",
        clicks: 1,
        originalUrl: "$url.originalUrl",
        totalClicks: "$url.clicks",
        createdAt: "$url.createdAt",
      },
    },
  ]);

module.exports = { breakdown, clicksOverTime, topLinksByPeriod };
