const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const Url = require("../models/urlModel");
const { getPlanConfig } = require("../config/plans");

exports.requirePlan = (...plans) =>
  catchAsync(async (req, res, next) => {
    const userPlan = req.user.plan || "free";
    if (!plans.includes(userPlan)) {
      return next(
        new AppError(
          `This feature requires a ${plans.join(" or ")} plan`,
          403,
        ),
      );
    }
    next();
  });

exports.requireFeature = (feature) =>
  catchAsync(async (req, res, next) => {
    const { features } = getPlanConfig(req.user.plan || "free");
    if (!features[feature]) {
      return next(
        new AppError("This feature is not included in your plan", 403),
      );
    }
    next();
  });

exports.checkLinkQuota = catchAsync(async (req, res, next) => {
  const { maxLinks } = getPlanConfig(req.user.plan || "free");
  if (!Number.isFinite(maxLinks)) return next();

  const count = await Url.countDocuments({ user: req.user._id });
  if (count >= maxLinks) {
    return next(
      new AppError(
        `Link limit reached (${maxLinks}). Upgrade to Pro for unlimited links.`,
        403,
      ),
    );
  }
  next();
});

exports.requireCookieAuth = (req, res, next) => {
  if (req.authMethod === "api_key") {
    return next(
      new AppError("Manage API keys from the dashboard while signed in", 403),
    );
  }
  next();
};
