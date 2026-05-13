const validator = require("validator");
const AppError = require("../utils/AppError");

const validateUrl = (req, res, next) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return next(new AppError("Original URL is required", 400));
  }

  if (
    !validator.isURL(originalUrl, {
      protocols: ["http", "https"],
      require_protocol: true,
    })
  ) {
    return next(new AppError("Invalid URL format", 400));
  }

  if (originalUrl.length > 2048) {
    return next(new AppError("URL too long", 400));
  }

  next();
};



module.exports = validateUrl;
