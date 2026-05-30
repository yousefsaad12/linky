const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError.js");
const User = require("../models/userModel");

// 1. Helper function to generate JWT signatures
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// 2. Production-safe Cross-Origin Cookie Settings
const isProduction = process.env.NODE_ENV === "production";

const jwtCookieOptions = {
  httpOnly: true,
  secure: isProduction, // Evaluates to true on Azure HTTPS, false on local HTTP
  sameSite: isProduction ? "none" : "lax", // 'none' enables cross-domain exchange on Azure
  path: "/",
};

// 3. Google OAuth Redirect Callback Handler
exports.googleCallback = (req, res) => {
  const token = signToken(req.user._id);

  res.cookie("jwt", token, {
    ...jwtCookieOptions,
    maxAge: 10 * 24 * 60 * 60 * 1000, // 10 days
  });

  const targetUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  console.log(`Redirecting authenticated user to: ${targetUrl}`);
  
  return res.redirect(targetUrl);
};

// 4. Token Validation and Route Route Protection Middleware
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.cookies?.jwt) {
    token = req.cookies.jwt;
  }
  
  if (!token) {
    return next(new AppError("Not authenticated", 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new AppError("User no longer exists", 401));
  }

  req.user = user;
  next();
});

// 5. Hydrate User Session Profile for Next.js Hook
exports.getMe = (req, res) => {
  res.status(200).json({
    status: "success",
    data: {
      id: req.user._id,
      email: req.user.email,
      name: req.user.name,
    },
  });
};

// 6. Session De-authentication Clear Out
exports.logout = (req, res) => {
  res.clearCookie("jwt", jwtCookieOptions);

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};