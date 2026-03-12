require("dotenv").config({ path: "./config.env" });
const { nanoid } = require("nanoid");
const Url = require("./../models/urlModel");

exports.getAllUrls = async (req, res) => {
  try {
    const urls = await Url.find();

    res.status(200).json({
      status: "success",
      data: urls,
    });
  } catch (error) {
    res.status(404).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.createShortUrl = async (req, res) => {
  try {
    const originalUrl = req.body;
    const shortCode = nanoid(8);
    const shortUrl = process.env.BASE_URL;
    const url = await Url.create(originalUrl, shortCode);
    res.status(201).json({
      status: "success",
      data: {
        url,
        shortUrl,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
