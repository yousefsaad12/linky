const express = require("express");
const urlRouter = require("./routes/urlRoutes");
const globalErrorHandler = require("./middlewares/errorMiddleware");
const AppError = require("./utils/AppError");
const app = express();
app.use(express.json());


app.use("/api/v1/url", urlRouter);
app.use((req, res, next) => {
  next(new AppError(`Can not find ${req.originalUrl} on this server !`, 404));
});
app.use(globalErrorHandler);
module.exports = app;
