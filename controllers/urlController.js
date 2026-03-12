require("dotenv").config({ path: "./config.env" });
const { nanoid } = require("nanoid");
const Url = require("./../models/urlModel");

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



