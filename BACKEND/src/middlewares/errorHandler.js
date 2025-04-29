// src/middleware/errorHandler.js
import { ApiError } from '../utils/ApiError.js';
export default (err, req, res, next) => {
  if (!(err instanceof ApiError)) {
    console.error(err);
    err = new ApiError(500, 'Internal server error');
  }
  res
    .status(err.statusCode)
    .json({ success: false, message: err.message, errors: err.errors });
};