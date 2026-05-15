const MS_DAY = 24 * 60 * 60 * 1000;

const PERIODS = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

const parsePeriod = (raw = "30d") => {
  const period = String(raw).toLowerCase();
  const days = PERIODS[period];

  if (days === undefined) {
    return { period: "30d", since: new Date(Date.now() - 30 * MS_DAY) };
  }

  if (days === null) {
    return { period: "all", since: null };
  }

  const ms = period === "24h" ? MS_DAY : days * MS_DAY;
  return { period, since: new Date(Date.now() - ms) };
};

const clickMatch = (since, shortCode) => {
  const match = {};
  if (since) match.clickedAt = { $gte: since };
  if (shortCode) match.shortCode = shortCode;
  return match;
};

module.exports = { parsePeriod, clickMatch };
