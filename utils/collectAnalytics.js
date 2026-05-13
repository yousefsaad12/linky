const { UAParser } = require("ua-parser-js");
const geoip = require("geoip-lite");

const collectAnalytics = (req) => {
  // Parse User-Agent
  const parser = new UAParser(req.headers["user-agent"]);
  const device = parser.getDevice().type;

  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket.remoteAddress;

  // Geo lookup
  const geo = geoip.lookup(ip);

  return {
    os: parser.getOS().name || "unknown",
    browser: parser.getBrowser().name || "unknown",
    deviceType:
      device === "mobile"
        ? "mobile"
        : device === "tablet"
          ? "tablet"
          : device
            ? "desktop"
            : "unknown",
    referrer: req.headers["referer"] || "direct",
    region: geo?.region || "unknown",
    city: geo?.city || "unknown",
  };
};

module.exports = collectAnalytics;
