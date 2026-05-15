const express = require("express");
const passport = require("passport");

const { googleCallback, protect } = require("../controllers/authController");

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
module.exports = router;
