const catchAsync = require("./../utils/catchAsync");
const AppError = require("../utils/AppError");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const jwtTokenCreation = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;

  const user = await User.create({ name, email, password, passwordConfirm });

  const token = jwtTokenCreation(user._id);

  res.status(201).json({
    status: "success",
    token,
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) return next(new AppError("there is no user with this email", 400));

  if (!(await user.validatingPassword(password)))
    return next(
      new AppError("incorrect email or password please try again !", 401),
    );

  const token = jwtTokenCreation(user._id);

  res.status(200).json({
    status: "success",
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) return next(new AppError("You are not logged in", 401));
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const user = await User.findById(decode.id);

  if (!user) return next(new AppError("this user is not available", 401));

  if (!user.validatingToken(decode.iat))
    return next(new AppError("Password changed recently. Login again.", 401));

  req.user = user;
  next();
});
