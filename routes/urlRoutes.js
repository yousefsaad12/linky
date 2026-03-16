const express = require("express");
const urlController = require("./../controllers/urlController");
const urlRouter = express.Router();
const validateUrl = require("./../middlewares/validateUrl");
urlRouter
  .route("/")
  .post(validateUrl, urlController.createShortUrl)
  .get(urlController.getAllUrls);

urlRouter
  .route("/:shortCode")
  .get(urlController.getOriginalUrl)
  .delete(urlController.deleteUrl);

module.exports = urlRouter;
