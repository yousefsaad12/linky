const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const ApiKey = require("../models/apiKeyModel");
const {
  generateApiKey,
  hashApiKey,
  keyDisplayPrefix,
} = require("../utils/apiKeyUtils");

const MAX_KEYS_PER_USER = 5;

exports.createApiKey = catchAsync(async (req, res, next) => {
  const name = (req.body.name || "Default").trim().slice(0, 64);
  if (!name) {
    return next(new AppError("API key name is required", 400));
  }

  const activeCount = await ApiKey.countDocuments({
    user: req.user._id,
    revokedAt: null,
  });

  if (activeCount >= MAX_KEYS_PER_USER) {
    return next(
      new AppError(
        `You can have at most ${MAX_KEYS_PER_USER} active API keys`,
        400,
      ),
    );
  }

  const rawKey = generateApiKey();

  const apiKey = await ApiKey.create({
    user: req.user._id,
    name,
    keyHash: hashApiKey(rawKey),
    prefix: keyDisplayPrefix(rawKey),
  });

  res.status(201).json({
    status: "success",
    message: "Store this key securely — it will not be shown again.",
    data: {
      id: apiKey._id,
      name: apiKey.name,
      prefix: apiKey.prefix,
      key: rawKey,
      createdAt: apiKey.createdAt,
    },
  });
});

exports.listApiKeys = catchAsync(async (req, res) => {
  const keys = await ApiKey.find({
    user: req.user._id,
    revokedAt: null,
  })
    .sort({ createdAt: -1 })
    .select("name prefix lastUsedAt createdAt")
    .lean();

  res.status(200).json({
    status: "success",
    results: keys.length,
    data: keys,
  });
});

exports.revokeApiKey = catchAsync(async (req, res, next) => {
  const apiKey = await ApiKey.findOneAndUpdate(
    {
      _id: req.params.id,
      user: req.user._id,
      revokedAt: null,
    },
    { revokedAt: new Date() },
    { new: true },
  );

  if (!apiKey) {
    return next(new AppError("API key not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "API key revoked",
  });
});
