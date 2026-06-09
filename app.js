const express = require("express");
const helmet = require("helmet");
const mongoSanitize = require("./middlewares/mongoSanitize.js");
const xss = require("xss");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const passport = require("passport");
require("./config/passport");

const {
  redirectLimiter,
  createUrlLimiter,
} = require("./middlewares/rateLimit.js");
const urlRouter = require("./routes/urlRoutes");
const urlController = require("./controllers/urlController.js");
const authRouter = require("./routes/authRoutes");
const analyticsRouter = require("./routes/analyticsRoutes");
const globalErrorHandler = require("./middlewares/errorMiddleware");
const AppError = require("./utils/appError");

const app = express();

// 🚀 FIX 1: Safe proxy trust structure for Azure (Prevents Rate Limit Crashing)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
} else {
  app.set("trust proxy", false);
}

app.use(helmet());

// 🚀 FIX 2: Explicitly authorize your frontend URLs so cookies attach properly
const allowedOrigins = [
  "http://localhost:3000",
  "https://lnqo.vercel.app" // Add your frontend Azure/Vercel URL here when deployed
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, postman, curl)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS Policy Block: Origin not allowed."));
      }
    },
    credentials: true, // 💡 Crucial: Informs browser it is safe to forward cookies
  })
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

// API Routes
app.use("/api/v1/url", urlRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/analytics", analyticsRouter);
app.get("/:shortCode", redirectLimiter, urlController.getOriginalUrl);

// 404 Fallthrough Handler
app.use((req, res, next) => {
  next(new AppError(`Can not find ${req.originalUrl} on this server !`, 404));
});

app.use(globalErrorHandler);

module.exports = app;