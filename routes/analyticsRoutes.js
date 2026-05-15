const express = require("express");
const analyticsController = require("../controllers/analyticsController");
const authController = require("../controllers/authController");

const analyticsRouter = express.Router();

analyticsRouter.use(authController.protect);

analyticsRouter.get("/overview", analyticsController.getOverview);
analyticsRouter.get("/top-links", analyticsController.getTopLinks);
analyticsRouter.get("/links", analyticsController.getLinksTable);
analyticsRouter.get("/recent-clicks", analyticsController.getRecentClicks);
analyticsRouter.get("/links/:shortCode", analyticsController.getUrlAnalytics);

module.exports = analyticsRouter;
