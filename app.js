const express = require("express");
const helmet = require("helmet");
const mongoSanitize = require("./middlewares/mongoSanitize.js");
const xss = require("xss");
const cookieParser = require("cookie-parser");

const passport = require("passport");
require("./config/passport");

const {
  redirectLimiter,
  createUrlLimiter,
} = require("./../middlewares/rateLimit");
const urlRouter = require("./routes/urlRoutes");
const urlController = require("./controllers/urlController.js");
const authRouter = require("./routes/authRoutes");
const analyticsRouter = require("./routes/analyticsRoutes");
const globalErrorHandler = require("./middlewares/errorMiddleware");
const AppError = require("./utils/appError");

const app = express();

app.use(helmet());

const cors = require("cors");

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // ← allows cookies cross-origin
  }),
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.use(mongoSanitize);
app.use((req, res, next) => {
  if (req.body) req.body = JSON.parse(xss(JSON.stringify(req.body)));
  if (req.query) req.query = JSON.parse(xss(JSON.stringify(req.query)));
  if (req.params) req.params = JSON.parse(xss(JSON.stringify(req.params)));
  next();
});

app.use(passport.initialize());

app.use("/api/v1/url", urlRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.get("/:shortCode", redirectLimiter, urlController.getOriginalUrl);
app.use((req, res, next) => {
  next(new AppError(`Can not find ${req.originalUrl} on this server !`, 404));
});

app.use(globalErrorHandler);
module.exports = app;
