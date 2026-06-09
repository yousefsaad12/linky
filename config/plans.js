const PLANS = {
  free: {
    maxLinks: 100,
    clickHistoryDays: 30,
    features: {
      basicAnalytics: true,
      deviceAnalytics: true,
      countryAnalytics: true,
      cityAnalytics: false,
      advancedAnalytics: false,
      apiAccess: false,
    },
  },
  pro: {
    maxLinks: Infinity,
    clickHistoryDays: 365,
    features: {
      basicAnalytics: true,
      deviceAnalytics: true,
      countryAnalytics: true,
      cityAnalytics: true,
      advancedAnalytics: true,
      apiAccess: true,
    },
  },
};

const getPlanConfig = (plan = "free") => PLANS[plan] || PLANS.free;

module.exports = { PLANS, getPlanConfig };
