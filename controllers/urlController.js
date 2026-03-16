const Url = require("./../models/urlModel");
const Counter = require("./../models/counterModel");
const encodeBase62 = require("./../utils/base62");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("../utils/AppError");

exports.getAllUrls = catchAsync(async (req, res, next) => {
  const urls = await Url.find();

  res.status(200).json({
    status: "success",
    data: urls,
  });
});

exports.createShortUrl = catchAsync(async (req, res, next) => {
  const { originalUrl } = req.body;

  const existingUrl = await Url.findOne({ originalUrl });

  if (existingUrl)
    return res.status(200).json({
      status: "success",
      data: {
        url: existingUrl,
        shortUrl: process.env.BASE_URL + existingUrl.shortCode,
      },
    });

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

  if (!url) return next(new AppError(404, "This short URL is not found"));

  res.redirect(url.originalUrl);

  Url.updateOne(
    { shortCode: req.params.shortCode },
    { $inc: { clicks: 1 } },
  ).exec();
});

exports.deleteUrl = catchAsync(async (req, res, next) => {
  const url = await Url.findOneAndDelete({ shortCode: req.params.shortCode });

  if (!url) return next(new AppError(404, "This short URL is not found"));

  res.status(204).send();
});
