const validator = require("validator");

const validateUrl = async (req, res, next) => {
  try {
    const { originalUrl } = req.body;
    if (!originalUrl)
      return res
        .status(400)
        .json({ status: "fail", message: "original URL is required" });

    if (
      !validator.isURL(originalUrl, {
        protocols: ["http", "https"],
        require_protocol: true,
      })
    ) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid URL format",
      });
    }

    if (originalUrl.length > 2048)
      return res.status(400).json({
        status: "fail",
        message: "URL too long",
      });

      next()
      
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "URL validation failed",
    });
  }
};
