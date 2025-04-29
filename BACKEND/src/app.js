import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import authRoutes from './routes/auth.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';
import { CORS_ORIGIN } from './config/index.js';

const app = express();

// Security headers
app.use(helmet());
// Logging
app.use(morgan('dev'));
// CORS
app.use(cors({ origin: CORS_ORIGIN.split(','), credentials: true }));
// Body parsers
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));
app.use(cookieParser());
// Static
app.use('/public', express.static('public'));

// API versioning
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/meeting', meetingRoutes);

// 404 handler & global error handler
app.use(notFound);
app.use(errorHandler);

export default app;
