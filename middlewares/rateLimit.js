const rateLimit = require("express-rate-limit");
const AppError = require("./../utils/AppError");

exports.redirectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,

  handler: (req, res, next) => {
    return next(new AppError("Too many requests, please slow down.", 429));
  },
});

exports.createUrlLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30, // protect system from spam
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    return next(
      new AppError("Too many URLs created from this IP, try later.", 429),
    );
  },
});

exports.analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    return next(new AppError("Too many requests, please slow down.", 429));
  },
});
