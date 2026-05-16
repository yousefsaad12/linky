const Url = require("../models/urlModel");

/** Mongo filter for URLs owned by a user */
const userUrlFilter = (userId) => ({ user: userId });

/** Distinct short codes for a user's links */
const getUserShortCodes = (userId) =>
  Url.distinct("shortCode", { user: userId });

/**
 * Build a Click collection match scoped to one user's URLs.
 * Returns null if shortCode is given but not owned by the user.
 */
const scopeClickMatch = async (userId, since, shortCode) => {
  const match = {};

  if (since) {
    match.clickedAt = { $gte: since };
  }

  if (shortCode) {
    const owned = await Url.exists({ shortCode, user: userId });
    if (!owned) return null;
    match.shortCode = shortCode;
    return match;
  }

  const codes = await getUserShortCodes(userId);
  match.shortCode = codes.length ? { $in: codes } : { $in: [] };
  return match;
};

module.exports = { userUrlFilter, getUserShortCodes, scopeClickMatch };
