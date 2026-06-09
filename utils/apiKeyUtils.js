const crypto = require("crypto");
const { nanoid } = require("nanoid");

const KEY_PREFIX = "lnqo_";

const generateApiKey = () => `${KEY_PREFIX}${nanoid(32)}`;

const hashApiKey = (raw) =>
  crypto.createHash("sha256").update(raw).digest("hex");

const keyDisplayPrefix = (raw) => raw.slice(0, KEY_PREFIX.length + 4);

module.exports = {
  KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  keyDisplayPrefix,
};
