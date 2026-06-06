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
  console.log("prompt param:", req.query.prompt); // 👈 add this
  
  const prompt = req.query.prompt === "select_account" 
    ? "select_account" 
    : "none";

  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt,
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
