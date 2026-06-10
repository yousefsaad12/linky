const { UAParser } = require("ua-parser-js");
const geoip = require("geoip-lite");

const collectAnalytics = (req) => {
  const parser = new UAParser(req.headers["user-agent"]);
  const device = parser.getDevice().type;

  const forwarded = req.headers["x-forwarded-for"];
  let ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket.remoteAddress;

  if (ip?.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  const geo = geoip.lookup(ip);
  console.log("IP:", ip);
  console.log("GEO:", geo);

  return {
    os: parser.getOS().name || "unknown",
    browser: parser.getBrowser().name || "unknown",
    deviceType:
      device === "mobile" ? "mobile"
      : device === "tablet" ? "tablet"
      : "desktop",
    referrer: req.headers["referer"] || "direct",
    region: geo?.region || "unknown",
    city: geo?.city || "unknown",
  };
};

module.exports = collectAnalytics;