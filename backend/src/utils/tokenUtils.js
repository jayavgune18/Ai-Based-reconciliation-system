const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('./errorHandler');

/**
 * Generate JWT Token
 * Creates access and refresh tokens for authenticated users
 */

/**
 * Generate access token (short-lived)
 *
 * @param {object} payload - Data to encode in token
 * @returns {string} - Access token
 */
const generateAccessToken = (payload) => {
  try {
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRY || '24h',
      algorithm: 'HS256',
    });
    return token;
  } catch (error) {
    throw new Error('Failed to generate access token');
  }
};

/**
 * Generate refresh token (long-lived)
 *
 * @param {object} payload - Data to encode in token
 * @returns {string} - Refresh token
 */
const generateRefreshToken = (payload) => {
  try {
    const token = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
      algorithm: 'HS256',
    });
    return token;
  } catch (error) {
    throw new Error('Failed to generate refresh token');
  }
};

/**
 * Verify access token
 *
 * @param {string} token - Token to verify
 * @returns {object} - Decoded token payload
 * @throws {AuthenticationError} - If token is invalid
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid token');
    }
    throw new AuthenticationError('Token verification failed');
  }
};

/**
 * Verify refresh token
 *
 * @param {string} token - Token to verify
 * @returns {object} - Decoded token payload
 * @throws {AuthenticationError} - If token is invalid
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    });
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AuthenticationError('Refresh token has expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new AuthenticationError('Invalid refresh token');
    }
    throw new AuthenticationError('Refresh token verification failed');
  }
};

/**
 * Decode token without verification (for debugging)
 *
 * @param {string} token - Token to decode
 * @returns {object} - Decoded token payload
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    throw new AuthenticationError('Failed to decode token');
  }
};

/**
 * Extract token from request headers
 *
 * @param {object} headers - Request headers
 * @returns {string|null} - Token or null
 */
const extractTokenFromHeaders = (headers) => {
  const authHeader = headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  extractTokenFromHeaders,
};
