const express = require("express");
const passport = require("passport");
const {
  googleCallback,
  logout,
  protect,
  getMe,
} = require("../controllers/authController");
const apiKeyController = require("../controllers/apiKeyController");
const {
  requirePlan,
  requireFeature,
  requireCookieAuth,
} = require("../middlewares/checkPlan");

const router = express.Router();
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
  }),
  googleCallback,
);

router.get("/me", protect, getMe);

router.post("/logout", logout);

router
  .route("/api-keys")
  .get(
    protect,
    requireCookieAuth,
    requirePlan("pro"),
    requireFeature("apiAccess"),
    apiKeyController.listApiKeys,
  )
  .post(
    protect,
    requireCookieAuth,
    requirePlan("pro"),
    requireFeature("apiAccess"),
    apiKeyController.createApiKey,
  );

router.delete(
  "/api-keys/:id",
  protect,
  requireCookieAuth,
  requirePlan("pro"),
  requireFeature("apiAccess"),
  apiKeyController.revokeApiKey,
);

module.exports = router;
