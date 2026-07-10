const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String,
    required: function() {
      // Password required only for local accounts, not OAuth
      return !this.googleId && !this.githubId;
    },
    select: false
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  // OAuth fields
  googleId: { type: String, index: true },
  githubId: { type: String, index: true },
  avatar: { type: String },
  // OTP fields
  otpCode: { type: String },
  otpExpires: { type: Date },
  isVerified: { type: Boolean, default: false },
  // Account status
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Pre-save password hashing (only for local accounts)
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);