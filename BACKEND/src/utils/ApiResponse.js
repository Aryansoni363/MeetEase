// src/utils/ApiResponse.js

/**
 * Standard API response structure.
 */
class ApiResponse {
  /**
   * Creates an instance of ApiResponse.
   * @param {boolean} success - Indicates if the operation was successful.
   * @param {string} message - A descriptive message.
   * @param {object} [data=null] - Optional data payload.
   */
  constructor(success, message, data = null) {
    this.success = success;
    this.message = message;
    if (data !== null) {
      this.data = data;
    }
  }
}

module.exports = { ApiResponse };
