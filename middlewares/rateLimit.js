const rateLimit = require("express-rate-limit");

exports.redirectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please slow down.",
});


