const express = require("express");
const urlController = require("./../controllers/urlController");
const urlRouter = express.Router();

urlRouter
  .route("/")
  .post(urlController.createShortUrl)
  .get(urlController.getAllUrls);


module.exports = urlRouter