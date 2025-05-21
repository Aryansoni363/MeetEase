// backend/src/middlewares/correlationId.js
import { v4 as uuidv4 } from 'uuid';

export default function correlationId(req, res, next) {
  // Create a unique id for each request
  req.correlationId = uuidv4();
  // Optionally, expose it in the response headers for client-side correlation
  res.setHeader('X-Correlation-Id', req.correlationId);
  next();
}
