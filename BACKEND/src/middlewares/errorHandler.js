// backend/src/middleware/errorHandler.js
import { ApiError } from '../utils/ApiError.js';
import logger from '../config/logger.js';

export default (err, req, res, next) => {
  // If the error is not an instance of ApiError, log the stack and create a new ApiError.
  if (!(err instanceof ApiError)) {
    logger.error(err.stack || err.message);
    err = new ApiError(500, 'Internal server error');
  } else {
    logger.error(err.message);
  }
  
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    errors: err.errors
  });
};
