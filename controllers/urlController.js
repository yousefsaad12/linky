const Url = require("./../models/urlModel");
const Counter = require("./../models/counterModel");
const Click = require("./../models/clickModel");
const encodeBase62 = require("./../utils/base62");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("../utils/AppError");
const collectAnalytics = require("./../utils/collectAnalytics");

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
  // still here we need the caching layer
  const url = await Url.findOne({ shortCode: req.params.shortCode })
    .select("originalUrl")
    .lean();

  if (!url) return next(new AppError("This short URL is not found", 404));

  res.redirect(301, url.originalUrl);

  Url.updateOne({ shortCode: req.params.shortCode }, { $inc: { clicks: 1 } });

  const analyticsData = collectAnalytics(req);
  Click.create({
    shortCode: req.params.shortCode,
    ...analyticsData,
  }).exec();
});

exports.deleteUrl = catchAsync(async (req, res, next) => {
  const url = await Url.findOneAndDelete({ shortCode: req.params.shortCode });

  if (!url) return next(new AppError("This short URL is not found", 404));

  await Click.deleteMany({ shortCode: req.params.shortCode });
  res.status(204).send();
});
