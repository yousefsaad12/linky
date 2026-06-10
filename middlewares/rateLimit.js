const rateLimit = require("express-rate-limit");
const AppError = require("./../utils/appError.js");

// 🛠️ Helper function to strip Azure's appended port numbers from the IP string
const azureKeyGenerator = (req) => {
  // Pull from standard Express location or fallback directly to Azure's proxy header
  const rawIp = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  
  if (!rawIp) return "unknown-ip";

  // If there's a comma-separated list of IPs, grab the first one (the client)
  const clientIp = rawIp.split(",")[0].trim();

  // If it's an IPv4 address with an attached port (e.g., 197.46.56.156:60514)
  // we split by the colon and just return the IP address.
  // !clientIp.includes("::") ensures we don't accidentally mangle an IPv6 address.
  if (clientIp.includes(":") && !clientIp.includes("::")) {
    return clientIp.split(":")[0];
  }

  return clientIp;
};

exports.redirectLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: azureKeyGenerator, // ✨ Added Azure fix
  handler: (req, res, next) => {
    return next(new AppError("Too many requests, please slow down.", 429));
  },
});

exports.createUrlLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1000, // protect system from spam
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: azureKeyGenerator, // ✨ Added Azure fix
  handler: (req, res, next) => {
    return next(
      new AppError("Too many URLs created from this IP, try later.", 429)
    );
  },
});

exports.analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: azureKeyGenerator, // ✨ Added Azure fix
  handler: (req, res, next) => {
    return next(new AppError("Too many requests, please slow down.", 429));
  },
});