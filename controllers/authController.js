const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError.js");
const User = require("../models/userModel");
const Url = require("../models/urlModel");
const ApiKey = require("../models/apiKeyModel");
const { getPlanConfig } = require("../config/plans");
const { hashApiKey } = require("../utils/apiKeyUtils");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const jwtCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
};

// 1. Google OAuth Callback
exports.googleCallback = (req, res) => {
  const token = signToken(req.user._id);

  res.cookie("jwt", token, {
    ...jwtCookieOptions,
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  return res.redirect(process.env.FRONTEND_URL);
};

const attachUser = (req, user, authMethod) => {
  if (!user.isActive) {
    throw new AppError("This account has been deactivated", 401);
  }
  req.user = user;
  req.authMethod = authMethod;
};

// 2. Token Validation and Route Protection Middleware
exports.protect = catchAsync(async (req, res, next) => {
  const bearer = req.headers.authorization;
  if (bearer?.startsWith("Bearer ")) {
    const rawKey = bearer.slice(7).trim();
    if (!rawKey) {
      return next(new AppError("Not authenticated", 401));
    }

    const apiKey = await ApiKey.findOne({
      keyHash: hashApiKey(rawKey),
      revokedAt: null,
    });

    if (!apiKey) {
      return next(new AppError("Invalid API key", 401));
    }

    const user = await User.findById(apiKey.user);
    if (!user) {
      return next(new AppError("User no longer exists", 401));
    }

    if ((user.plan || "free") !== "pro") {
      return next(new AppError("API access requires a Pro plan", 403));
    }

    apiKey.lastUsedAt = new Date();
    await apiKey.save({ validateBeforeSave: false });

    attachUser(req, user, "api_key");
    return next();
  }

  const token = req.cookies?.jwt;
  if (!token) {
    return next(new AppError("Not authenticated", 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new AppError("User no longer exists", 401));
  }

  attachUser(req, user, "cookie");
  next();
});

// 3. Hydrate User Session Profile for Next.js Hook
exports.getMe = catchAsync(async (req, res) => {
  const plan = req.user.plan || "free";
  const planConfig = getPlanConfig(plan);
  const linkCount = await Url.countDocuments({ user: req.user._id });

  res.status(200).json({
    status: "success",
    data: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
      avatar: req.user.avatar,
      plan,
      limits: {
        maxLinks: Number.isFinite(planConfig.maxLinks)
          ? planConfig.maxLinks
          : null,
        clickHistoryDays: planConfig.clickHistoryDays,
      },
      features: planConfig.features,
      usage: {
        links: linkCount,
      },
    },
  });
});

// 4. Session De-authentication Clear Out
exports.logout = (req, res) => {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};