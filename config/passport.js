const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const AppError = require("../utils/appError");
const User = require("../models/userModel");


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      proxy: true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 1. Validate profile
        if (!profile) {
          return done(new AppError("Google profile not found", 400), false);
        }

        if (!profile.emails || !profile.emails.length) {
          return done(
            new AppError("No email returned from Google account", 400),
            false,
          );
        }

        const email = profile.emails[0].value;

        // 2. Find existing user
        let user = await User.findOne({ email });

        // 3. Create user if not exists
        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value || null,
          });
        } else {
          // 4. Optional: link Google account if user exists without googleId
          if (!user.googleId) {
            user.googleId = profile.id;
            user.avatar = user.avatar || profile.photos?.[0]?.value;
            await user.save();
          }
        }

        // 5. Success
        return done(null, user);
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);