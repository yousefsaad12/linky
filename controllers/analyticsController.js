const Url = require("../models/urlModel");
const Click = require("../models/clickModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError.js");
const { parsePeriod, clickMatch } = require("../utils/parsePeriod");
const {
  breakdown,
  clicksOverTime,
  topLinksByPeriod,
} = require("../utils/analyticsAggregations");

const MS_DAY = 24 * 60 * 60 * 1000;

const periodWindows = () => ({
  today: new Date(Date.now() - MS_DAY),
  last7d: new Date(Date.now() - 7 * MS_DAY),
  last30d: new Date(Date.now() - 30 * MS_DAY),
});

exports.getOverview = catchAsync(async (req, res) => {
  const { period, since } = parsePeriod(req.query.period);
  const match = clickMatch(since);
  const windows = periodWindows();

  const [
    totalUrls,
    totalClicks,
    clicksInPeriod,
    clicksToday,
    clicksLast7d,
    clicksLast30d,
    activeLinksInPeriod,
    deviceTypes,
    browsers,
    referrers,
    regions,
    timeline,
    topLinks,
  ] = await Promise.all([
    Url.countDocuments(),
    Click.countDocuments(),
    since ? Click.countDocuments(match) : Click.countDocuments(),
    Click.countDocuments({ clickedAt: { $gte: windows.today } }),
    Click.countDocuments({ clickedAt: { $gte: windows.last7d } }),
    Click.countDocuments({ clickedAt: { $gte: windows.last30d } }),
    since
      ? Click.distinct("shortCode", match).then((codes) => codes.length)
      : Url.countDocuments({ clicks: { $gt: 0 } }),
    breakdown(match, "deviceType"),
    breakdown(match, "browser"),
    breakdown(match, "referrer", 15),
    breakdown(match, "region"),
    clicksOverTime(
      match,
      period === "24h" ? "hour" : "day",
    ),
    topLinksByPeriod(match, Number(req.query.limit) || 5),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      period,
      summary: {
        totalUrls,
        totalClicks,
        clicksInPeriod,
        clicksToday,
        clicksLast7d,
        clicksLast30d,
        activeLinksInPeriod,
      },
      timeline,
      topLinks,
      breakdowns: {
        deviceTypes,
        browsers,
        referrers,
        regions,
      },
    },
  });
});

exports.getTopLinks = catchAsync(async (req, res) => {
  const { period, since } = parsePeriod(req.query.period);
  const match = clickMatch(since);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

  const links = await topLinksByPeriod(match, limit);

  res.status(200).json({
    status: "success",
    results: links.length,
    period,
    data: links,
  });
});

exports.getLinksTable = catchAsync(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const sort = req.query.sort === "clicks" ? { clicks: -1 } : { createdAt: -1 };

  const [urls, total] = await Promise.all([
    Url.find()
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("shortCode originalUrl clicks createdAt updatedAt")
      .lean(),
    Url.countDocuments(),
  ]);

  res.status(200).json({
    status: "success",
    page,
    totalPages: Math.ceil(total / limit) || 1,
    results: urls.length,
    total,
    data: urls,
  });
});

exports.getRecentClicks = catchAsync(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const { shortCode } = req.query;

  const filter = shortCode ? { shortCode } : {};

  const clicks = await Click.find(filter)
    .sort({ clickedAt: -1 })
    .limit(limit)
    .select("-jobId -__v")
    .lean();

  res.status(200).json({
    status: "success",
    results: clicks.length,
    data: clicks,
  });
});

exports.getUrlAnalytics = catchAsync(async (req, res, next) => {
  const { shortCode } = req.params;
  const { period, since } = parsePeriod(req.query.period);
  const match = clickMatch(since, shortCode);

  const url = await Url.findOne({ shortCode })
    .select("shortCode originalUrl clicks createdAt updatedAt")
    .lean();

  if (!url) {
    return next(new AppError("Short URL not found", 404));
  }

  const granularity =
    req.query.granularity === "hour" || period === "24h" ? "hour" : "day";

  const [
    clicksInPeriod,
    deviceTypes,
    browsers,
    operatingSystems,
    referrers,
    regions,
    cities,
    timeline,
  ] = await Promise.all([
    since ? Click.countDocuments(match) : Click.countDocuments({ shortCode }),
    breakdown(match, "deviceType"),
    breakdown(match, "browser"),
    breakdown(match, "os"),
    breakdown(match, "referrer", 15),
    breakdown(match, "region"),
    breakdown(match, "city", 15),
    clicksOverTime(match, granularity),
  ]);

  const base = (process.env.BASE_URL || "").replace(/\/+$/, "") + "/";

  res.status(200).json({
    status: "success",
    data: {
      period,
      url: {
        ...url,
        shortUrl: base + url.shortCode,
      },
      summary: {
        totalClicks: url.clicks,
        clicksInPeriod,
      },
      timeline,
      breakdowns: {
        deviceTypes,
        browsers,
        operatingSystems,
        referrers,
        regions,
        cities,
      },
    },
  });
});
