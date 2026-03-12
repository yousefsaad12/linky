const express = require("express");
const urlController = require("./../controllers/urlController");
const router = express.Router();

router
  .route("/")
  .post(urlController.createShortUrl)
  .get(urlController.getAllUrls);
