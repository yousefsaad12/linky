const express = require("express");
const urlRouter = require("./routes/urlRoutes");
const globalErrorHandler = require("./middlewares/errorMiddleware");
const AppError = require("./utils/AppError");
const authRouter = require("./routes/authRoutes");
const passport = require("passport");
require("./config/passport");
const app = express();
app.use(express.json());

app.use(passport.initialize());
app.use(require("cookie-parser")());

app.use("/api/v1/url", urlRouter);
app.use("/api/v1/auth", authRouter);

app.use((req, res, next) => {
  next(new AppError(`Can not find ${req.originalUrl} on this server !`, 404));
});

app.use(globalErrorHandler);
module.exports = app;
