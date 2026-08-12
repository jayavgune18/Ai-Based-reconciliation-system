const { ValidationError } = require('../utils/errorHandler');

/**
 * Authentication Input Validation
 * Validates all auth-related input data
 */

/**
 * Validate registration input
 *
 * @param {object} data - User registration data
 * @throws {ValidationError} - If validation fails
 */
const validateRegistration = (data) => {
  const errors = [];

  // Validate first name
  if (!data.firstName || data.firstName.trim() === '') {
    errors.push('First name is required');
  } else if (data.firstName.length < 2) {
    errors.push('First name must be at least 2 characters');
  } else if (data.firstName.length > 50) {
    errors.push('First name cannot exceed 50 characters');
  }

  // Validate last name
  if (!data.lastName || data.lastName.trim() === '') {
    errors.push('Last name is required');
  } else if (data.lastName.length < 2) {
    errors.push('Last name must be at least 2 characters');
  } else if (data.lastName.length > 50) {
    errors.push('Last name cannot exceed 50 characters');
  }

  // Validate email
  if (!data.email || data.email.trim() === '') {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }

  // Validate password
  if (!data.password) {
    errors.push('Password is required');
  } else if (data.password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (!isStrongPassword(data.password)) {
    errors.push(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    );
  }

  // Validate password confirmation
  if (data.password !== data.confirmPassword) {
    errors.push('Passwords do not match');
  }

  if (errors.length > 0) {
    throw new ValidationError('Registration validation failed', errors);
  }
};

/**
 * Validate login input
 *
 * @param {object} data - User login data
 * @throws {ValidationError} - If validation fails
 */
const validateLogin = (data) => {
  const errors = [];

  // Validate email
  if (!data.email || data.email.trim() === '') {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Please enter a valid email address');
  }

  // Validate password
  if (!data.password) {
    errors.push('Password is required');
  } else if (data.password.length === 0) {
    errors.push('Password cannot be empty');
  }

  if (errors.length > 0) {
    throw new ValidationError('Login validation failed', errors);
  }
};

/**
 * Validate password change
 *
 * @param {object} data - Password change data
 * @throws {ValidationError} - If validation fails
 */
const validatePasswordChange = (data) => {
  const errors = [];

  // Validate old password
  if (!data.oldPassword) {
    errors.push('Current password is required');
  }

  // Validate new password
  if (!data.newPassword) {
    errors.push('New password is required');
  } else if (data.newPassword.length < 8) {
    errors.push('New password must be at least 8 characters');
  } else if (!isStrongPassword(data.newPassword)) {
    errors.push(
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    );
  }

  // Validate new password confirmation
  if (data.newPassword !== data.confirmPassword) {
    errors.push('New passwords do not match');
  }

  // Ensure old and new passwords are different
  if (data.oldPassword === data.newPassword) {
    errors.push('New password must be different from current password');
  }

  if (errors.length > 0) {
    throw new ValidationError('Password change validation failed', errors);
  }
};

/**
 * Validate email format
 *
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if email is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 *
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password meets strength requirements
 */
const isStrongPassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
};

module.exports = {
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  isValidEmail,
  isStrongPassword,
};
