/**
 * Centralized API Response Format
 * Ensures consistent response structure across all endpoints
 */

class APIResponse {
  /**
   * Constructor for API response
   *
   * @param {number} statusCode - HTTP status code
   * @param {object} data - Response data
   * @param {string} message - Response message
   * @param {boolean} success - Whether request was successful
   */
  constructor(statusCode, data, message = 'Success', success = true) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = success;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Send response to client
   *
   * @param {object} res - Express response object
   * @returns {object} - Formatted response
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
    });
  }
}

/**
 * Success Response Helper
 *
 * @param {number} statusCode - HTTP status code
 * @param {object} data - Response data
 * @param {string} message - Response message
 * @returns {object} - APIResponse instance
 */
const successResponse = (statusCode, data, message = 'Success') => {
  return new APIResponse(statusCode, data, message, true);
};

/**
 * Error Response Helper
 *
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {object} data - Additional error data
 * @returns {object} - APIResponse instance
 */
const errorResponse = (statusCode, message, data = null) => {
  return new APIResponse(statusCode, data, message, false);
};

module.exports = {
  APIResponse,
  successResponse,
  errorResponse,
};
