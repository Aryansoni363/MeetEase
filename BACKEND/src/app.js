// backend/src/app.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/user.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import notFound from './middlewares/notFound.js';
import errorHandler from './middlewares/errorHandler.js';
import { CORS_ORIGIN } from './config/index.js';
import logger from './config/logger.js';
import correlationId from './middlewares/correlationId.js';

const app = express();

// Add the correlation ID middleware early in the chain
app.use(correlationId);

// Use Morgan for HTTP logging with Winston
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN.split(','), credentials: true }));

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());
app.use('/public', express.static('public'));

app.use('/api/v1/users', authRoutes);
app.use('/api/v1/meeting', meetingRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
