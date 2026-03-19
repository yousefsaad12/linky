const rateLimit = require("express-rate-limit");

exports.redirectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please slow down.",
});

exports.createUrlLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // protect system from spam
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many URLs created from this IP, try later.",
});
