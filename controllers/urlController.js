const Url = require("./../models/urlModel");
const Counter = require("./../models/counterModel");
const Click = require("./../models/clickModel");
const encodeBase62 = require("./../utils/base62");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("../utils/AppError");
const {
  urlCacheKey,
  getCache,
  setCache,
  deleteCache,
} = require("./../utils/redisClient");
const { scheduleAnalytics } = require("./../utils/scheduleAnalytics");

exports.getAllUrls = catchAsync(async (req, res, next) => {
  const urls = await Url.find();

  res.status(200).json({
    status: "success",
    data: urls,
  });
});

exports.createShortUrl = catchAsync(async (req, res, next) => {
  const { originalUrl } = req.body;

  const counterDoc = await Counter.findByIdAndUpdate(
    "url_count",
    { $inc: { seq: 1 } },
    {
      returnDocument: "after",
      upsert: true,
    },
  );

  const shortCode = encodeBase62(counterDoc.seq);
  const shortUrl = process.env.BASE_URL + shortCode;
  const url = await Url.create({ originalUrl, shortCode });

  return res.status(201).json({
    status: "success",
    data: {
      url,
      shortUrl,
    },
  });
});

exports.getOriginalUrl = catchAsync(async (req, res, next) => {
  const { shortCode } = req.params;

  const cached = await getCache(urlCacheKey(shortCode));
  if (cached) {
    scheduleAnalytics(req, res, shortCode);
    return res
      .status(200)
      .json({
        status: "success",
        cached: true,
        data: { shortCode, originalUrl: cached },
      });
  }

  const url = await Url.findOne({ shortCode }).select("originalUrl").lean();
  if (!url) return next(new AppError("Short URL not found", 404));

  await setCache(urlCacheKey(shortCode), url.originalUrl);
  scheduleAnalytics(req, res, shortCode);

  return res
    .status(200)
    .json({
      status: "success",
      cached: false,
      data: { shortCode, originalUrl: url.originalUrl },
    });
});

exports.deleteUrl = catchAsync(async (req, res, next) => {
  const url = await Url.findOneAndDelete({ shortCode: req.params.shortCode });
  if (!url) return next(new AppError("This short URL is not found", 404));

  await Click.deleteMany({ shortCode: req.params.shortCode });
  await deleteCache(urlCacheKey(req.params.shortCode));

  res.status(204).send();
});
