const express = require("express");
const urlController = require("./../controllers/urlController");
const urlRouter = express.Router();
const validateUrl = require("./../middlewares/validateUrl");
const {
  redirectLimiter,
  createUrlLimiter,
} = require("./../middlewares/rateLimit");
urlRouter
  .route("/")
  .post(createUrlLimiter, validateUrl, urlController.createShortUrl)
  .get(urlController.getAllUrls);

urlRouter
  .route("/:shortCode")
  .get(redirectLimiter, urlController.getOriginalUrl)
  .delete(urlController.deleteUrl);

module.exports = urlRouter;
