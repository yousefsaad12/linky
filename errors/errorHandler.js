const AppError = require("./../utils/AppError");

exports.handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path} : ${err.value}`;
  return new AppError(message, 400);
};

exports.handleValidationErrorsDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid Input Data ${errors.join(",")}`;

  return new AppError(400, message);
};

exports.handleDuplicateFieldDB = (err) => {
  const message = `Duplicate field value : ${
    Object.values(err.keyValue)[0]
  }. Please use another value!`;

  return new AppError(400, message);
};
