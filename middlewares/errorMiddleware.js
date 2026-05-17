const errorMap = require("../errors/errorMap");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  let error = err;

  const handler = errorMap[error.name] || errorMap[error.code];

  if (handler) error = handler(error);

  if (process.env.NODE_ENV === "development") {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
      stack: error.stack,
      error,
    });
  }

  if (error.isOperational) {
    return res.status(error.statusCode).json({
      status: error.status,
      message: error.message,
    });
  }

  console.error("💥 ERROR:", error);

  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
};