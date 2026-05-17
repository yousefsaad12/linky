const AppError = require("../utils/appError");

// MongoDB Cast Error
const handleCastErrorDB = (err) =>
  new AppError(`Invalid ${err.path}: ${err.value}`, 400);

// Duplicate Key Error (11000)
const handleDuplicateFieldsDB = (err) => {
  const value = Object.values(err.keyValue || {})[0];
  return new AppError(`Duplicate field value: ${value}`, 400);
};

// Validation Error
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  return new AppError(`Invalid input data: ${errors.join(". ")}`, 400);
};

// JWT Error
const handleJWTError = () =>
  new AppError("Invalid token. Please log in again.", 401);

// JWT Expired
const handleJWTExpiredError = () =>
  new AppError("Your token has expired. Please log in again.", 401);

module.exports = {
  handleCastErrorDB,
  handleDuplicateFieldsDB,
  handleValidationErrorDB,
  handleJWTError,
  handleJWTExpiredError,
};