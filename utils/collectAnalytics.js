const { UAParser } = require("ua-parser-js");
const geoip = require("geoip-lite");

const collectAnalytics = (req) => {
  // Parse User-Agent
  const parser = new UAParser(req.headers["user-agent"]);
  const device = parser.getDevice().type;

  // Get IP
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

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
          : "desktop",
    referrer: req.headers["referer"] || "direct",
    region: geo?.region || "unknown",
    city: geo?.city || "unknown",
  };
};

module.exports = collectAnalytics;
