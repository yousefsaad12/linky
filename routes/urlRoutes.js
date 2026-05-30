const express = require("express");
const urlController = require("./../controllers/urlController");
const authController = require("./../controllers/authController");
const urlRouter = express.Router();
const validateUrl = require("./../middlewares/validateUrl");
const {
  redirectLimiter,
  createUrlLimiter,
} = require("./../middlewares/rateLimit");
urlRouter
  .route("/")
  .post(
    authController.protect,
    createUrlLimiter,
    validateUrl,
    urlController.createShortUrl,
  )
  .get(authController.protect, urlController.getAllUrls);

urlRouter
  .route("/:shortCode")

  .delete(authController.protect,urlController.deleteUrl);

module.exports = urlRouter;
