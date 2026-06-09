const { getPlanConfig } = require("../config/plans");
const { parsePeriod } = require("./parsePeriod");

const MS_DAY = 24 * 60 * 60 * 1000;

const planMinSince = (plan) => {
  const { clickHistoryDays } = getPlanConfig(plan);
  return new Date(Date.now() - clickHistoryDays * MS_DAY);
};

/** Parse period query and clamp to the user's plan retention window. */
const parsePeriodForPlan = (raw, plan) => {
  const { period, since } = parsePeriod(raw);
  const minSince = planMinSince(plan);

  if (!since) {
    return { period, since: minSince, clamped: true };
  }

  if (since < minSince) {
    return { period, since: minSince, clamped: true };
  }

  return { period, since, clamped: false };
};

const hasFeature = (plan, feature) =>
  Boolean(getPlanConfig(plan).features[feature]);

module.exports = {
  planMinSince,
  parsePeriodForPlan,
  hasFeature,
  getPlanConfig,
};
