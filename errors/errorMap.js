const {
  handleCastErrorDB,
  handleDuplicateFieldsDB,
  handleValidationErrorDB,
  handleJWTError,
  handleJWTExpiredError,
} = require("./errorHandler");

const errorMap = {
  CastError: handleCastErrorDB,
  ValidationError: handleValidationErrorDB,
  11000: handleDuplicateFieldsDB,
  JsonWebTokenError: handleJWTError,
  TokenExpiredError: handleJWTExpiredError,
};

module.exports = errorMap;