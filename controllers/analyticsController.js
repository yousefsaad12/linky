const Url = require("../models/urlModel");
const Click = require("../models/clickModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError.js");
const { clickMatch } = require("../utils/parsePeriod");
const { userUrlFilter, scopeClickMatch } = require("../utils/userScope");
const {
  parsePeriodForPlan,
  hasFeature,
  planMinSince,
} = require("../utils/planUtils");

const userPlan = (req) => req.user.plan || "free";
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

const scopedWindowsMatch = async (userId, sinceDate) => {
  const base = await scopeClickMatch(userId, sinceDate);
  if (!base) return { shortCode: { $in: [] } };
  return base;
};

exports.getOverview = catchAsync(async (req, res) => {
  const plan = userPlan(req);
  const { period, since, clamped } = parsePeriodForPlan(req.query.period, plan);
  const match = await scopeClickMatch(req.user._id, since);
  const windows = periodWindows();
  const ownerFilter = userUrlFilter(req.user._id);

  const [todayMatch, last7dMatch, last30dMatch] = await Promise.all([
    scopedWindowsMatch(req.user._id, windows.today),
    scopedWindowsMatch(req.user._id, windows.last7d),
    scopedWindowsMatch(req.user._id, windows.last30d),
  ]);

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
    Url.countDocuments(ownerFilter),
    Click.countDocuments(match),
    Click.countDocuments(match),
    Click.countDocuments(todayMatch),
    Click.countDocuments(last7dMatch),
    Click.countDocuments(last30dMatch),
    since
      ? Click.distinct("shortCode", match).then((codes) => codes.length)
      : Url.countDocuments({ ...ownerFilter, clicks: { $gt: 0 } }),
    breakdown(match, "deviceType"),
    breakdown(match, "browser"),
    breakdown(match, "referrer", 15),
    breakdown(match, "region"),
    clicksOverTime(match, period === "24h" ? "hour" : "day"),
    topLinksByPeriod(match, Number(req.query.limit) || 5),
  ]);

  res.status(200).json({
    status: "success",
    data: {
      period,
      ...(clamped && { clamped: true }),
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
  const plan = userPlan(req);
  const { period, since, clamped } = parsePeriodForPlan(req.query.period, plan);
  const match = await scopeClickMatch(req.user._id, since);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

  const links = await topLinksByPeriod(match, limit);

  res.status(200).json({
    status: "success",
    results: links.length,
    period,
    ...(clamped && { clamped: true }),
    data: links,
  });
});

exports.getLinksTable = catchAsync(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const sort = req.query.sort === "clicks" ? { clicks: -1 } : { createdAt: -1 };
  const filter = userUrlFilter(req.user._id);

  const [urls, total] = await Promise.all([
    Url.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select("shortCode originalUrl clicks createdAt updatedAt")
      .lean(),
    Url.countDocuments(filter),
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

exports.getRecentClicks = catchAsync(async (req, res, next) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const { shortCode } = req.query;
  const since = planMinSince(userPlan(req));

  const match = await scopeClickMatch(
    req.user._id,
    since,
    shortCode || undefined,
  );
  if (match === null) {
    return next(new AppError("Short URL not found", 404));
  }

  const clicks = await Click.find(match)
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
  const plan = userPlan(req);
  const { period, since, clamped } = parsePeriodForPlan(req.query.period, plan);
  const includeCities = hasFeature(plan, "cityAnalytics");

  const url = await Url.findOne({
    shortCode,
    ...userUrlFilter(req.user._id),
  })
    .select("shortCode originalUrl clicks createdAt updatedAt")
    .lean();

  if (!url) {
    return next(new AppError("Short URL not found", 404));
  }

  const match = clickMatch(since, shortCode);
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
    includeCities ? breakdown(match, "city", 15) : Promise.resolve([]),
    clicksOverTime(match, granularity),
  ]);

  const base = (process.env.BASE_URL || "").replace(/\/+$/, "") + "/";

  res.status(200).json({
    status: "success",
    data: {
      period,
      ...(clamped && { clamped: true }),
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
