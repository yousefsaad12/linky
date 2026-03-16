const {
  handleCastErrorDB,
  handleValidationErrorDB,
  handleDuplicateFieldsDB,
} = require("./../errors/errorHandler");

const errorHandlerMap = {
  CastError: handleCastErrorDB,
  ValidationError: handleValidationErrorDB,
  11000: handleDuplicateFieldsDB,
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("ERROR 💥", err);
    res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }
};

module.exports = async (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === "production") {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;
    if (errorHandlerMap[error.name]) {
      error = errorHandlerMap[error.name](error);
    } else if (error.code && errorHandlerMap[error.code]) {
      error = errorHandlerMap[error.code](error);
    }
    sendErrorProd(error, res);
  }
};
