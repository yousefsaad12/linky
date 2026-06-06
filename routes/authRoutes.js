const express = require("express");
const passport = require("passport");
const {
  googleCallback,
  logout,
  protect,
  getMe
} = require("../controllers/authController");

const router = express.Router();

router.get("/google", (req, res, next) => {
  const prompt = req.query.prompt === "select_account"
    ? "select_account"
    : undefined; // 👈 undefined = let Google decide naturally

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    ...(prompt && { prompt }), // only add prompt if set
  })(req, res, next);
});

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

module.exports = router;
