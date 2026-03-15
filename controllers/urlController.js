require("dotenv").config({ path: "./config.env" });
const Url = require("./../models/urlModel");
const Counter = require("./../models/counterModel");
const encodeBase62 = require("./../utils/base62");

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
    const { originalUrl } = req.body;

    const existingUrl = await Url.findOne({ originalUrl });

    if (existingUrl)
      return res.status(200).json({
        status: "success",
        data: {
          url: existingUrl,
          shortUrl: process.env.BASE_URL + existingUrl.shortCode,
        },
      });

    const counterDoc = await Counter.findByIdAndUpdate(
      "url_count",
      { $inc: { seq: 1 } },
      {
        returnDocument: "after",
        upsert: true,
      },
    );

    const shortCode = encodeBase62(counterDoc.seq);
    const shortUrl = process.env.BASE_URL + shortCode;
    const url = await Url.create({ originalUrl, shortCode });
    return res.status(201).json({
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

exports.getOriginalUrl = async (req, res) => {
  try {
    const shortCode = req.params.shortCode;

    const url = await Url.findOne({
      shortCode: shortCode,
    });

    if (!url)
      return res.status(404).json({
        status: "fail",
        message: "This short URL is not found",
      });

    if (url.expiresAt < Date.now())
      return res.status(410).json({
        status: "fail",
        message: "This short URL is expired",
      });
    const originalUrl = url.originalUrl;

    url.clicks += 1;
    await url.save();
    res.redirect(originalUrl);
  } catch (error) {
    res.status(500).json({
      status: "fail",
      message: error.message,
    });
  }
};
