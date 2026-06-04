const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError.js");
const User = require("../models/userModel");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const jwtCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "none",
};

exports.googleCallback = (req, res) => {
  const token = signToken(req.user._id);

  res.cookie("jwt", token, {
    ...jwtCookieOptions,
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  return res.status(200).json({
    status: "success",
    user: req.user,
  });
};

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

exports.logout = (req, res) => {
  // Ensure clearCookie uses the same options (include path) so cookie is removed
  res.clearCookie("jwt", { ...jwtCookieOptions, path: "/" });

  res.status(200).json({
    status: "success",
    message: "Logged out successfully",
  });
};
