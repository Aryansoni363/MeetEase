// src/utils/ApiResponse.js

/**
 * Standard API response structure.
 */
class ApiResponse {
  /**
   * Creates an instance of ApiResponse.
   * @param {number} statusCode - HTTP status code.
   * @param {object} data - Data payload.
   * @param {string} message - A descriptive message.
   */
  constructor(statusCode, data, message) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.data = data;
    this.message = message;
  }
}

export { ApiResponse };
