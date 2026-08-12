const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema for Financial Reconciliation System
 * Stores user credentials, profile info, and role-based access control
 */
const userSchema = new mongoose.Schema(
  {
    // Basic Information
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [2, 'First name must be at least 2 characters'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      minlength: [2, 'Last name must be at least 2 characters'],
      maxlength: [50, 'Last name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email address',
      ],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't include password by default in queries
    },
    
    // Role-Based Access Control
    role: {
      type: String,
      enum: {
        values: ['admin', 'accountant', 'manager', 'viewer'],
        message: 'Invalid role. Must be admin, accountant, manager, or viewer',
      },
      default: 'viewer',
    },
    
    // Account Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    
    // Security Fields
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastPasswordChangeAt: {
      type: Date,
      default: Date.now,
    },
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    
    // Contact Information
    phone: {
      type: String,
      trim: true,
      sparse: true,
    },
    department: {
      type: String,
      trim: true,
    },
    
    // Audit Fields
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save middleware to hash password before storing
 * Only hashes if password is new or modified
 */
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    
    // Update password change timestamp
    this.lastPasswordChangeAt = new Date();
    
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance method to compare provided password with stored hashed password
 * Used during login authentication
 *
 * @param {string} enteredPassword - Password entered by user
 * @returns {Promise<boolean>} - True if passwords match
 */
userSchema.methods.comparePassword = async function (enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    throw new Error('Error comparing passwords');
  }
};

/**
 * Instance method to increment failed login attempts
 * Used for account lockout mechanism
 */
userSchema.methods.incLoginAttempts = async function () {
  // If lockout period has expired, reset attempts
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $set: { loginAttempts: 1, lockUntil: null },
    });
  }

  // Otherwise increment attempts
  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 30 minutes
  const maxAttempts = 5;
  const lockTimeMinutes = 30;

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = {
      lockUntil: new Date(Date.now() + lockTimeMinutes * 60 * 1000),
    };
  }

  return this.updateOne(updates);
};

/**
 * Instance method to reset login attempts after successful login
 */
userSchema.methods.resetLoginAttempts = async function () {
  return this.updateOne({
    $set: {
      loginAttempts: 0,
      lockUntil: null,
      lastLoginAt: new Date(),
    },
  });
};

/**
 * Virtual getter to check if account is locked
 */
userSchema.virtual('isLocked').get(function () {
  return this.lockUntil && this.lockUntil > new Date();
});

/**
 * Virtual getter for full name
 */
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

/**
 * Instance method to hide sensitive information
 */
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

// Create indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
