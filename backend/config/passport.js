const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this googleId
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      return done(null, user);
    }

    // Check if user exists with same email
    const email = profile.emails?.[0]?.value;
    if (email) {
      user = await User.findOne({ email });
      if (user) {
        // Link Google account to existing user
        user.googleId = profile.id;
        user.avatar = profile.photos?.[0]?.value || user.avatar;
        user.isVerified = true;
        await user.save();
        return done(null, user);
      }
    }

    // Create new user from Google profile
    user = await User.create({
      name: profile.displayName,
      email: email || `${profile.id}@google-oauth.local`,
      googleId: profile.id,
      avatar: profile.photos?.[0]?.value,
      isVerified: true,
      role: 'user'
    });

    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
  scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this githubId
    let user = await User.findOne({ githubId: profile.id });

    if (user) {
      return done(null, user);
    }

    // Get email from GitHub (may be in profile.emails or profile._json)
    let email = profile.emails?.[0]?.value || profile._json?.email;
    
    if (email) {
      user = await User.findOne({ email });
      if (user) {
        // Link GitHub account to existing user
        user.githubId = profile.id;
        user.avatar = profile.photos?.[0]?.value || user.avatar;
        user.isVerified = true;
        await user.save();
        return done(null, user);
      }
    }

    // Create new user from GitHub profile
    user = await User.create({
      name: profile.displayName || profile.username,
      email: email || `${profile.id}@github-oauth.local`,
      githubId: profile.id,
      avatar: profile.photos?.[0]?.value,
      isVerified: true,
      role: 'user'
    });

    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

module.exports = passport;