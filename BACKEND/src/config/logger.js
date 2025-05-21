// backend/src/config/logger.js
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize } = winston.format;

// Custom format to optionally include a correlationId if provided.
const logFormat = printf(({ level, message, timestamp, stack, correlationId }) => {
  const additional = correlationId ? ` [CorrelationId: ${correlationId}]` : '';
  return `${timestamp} ${level}: ${stack || message}${additional}`;
});

const logger = winston.createLogger({
  level: 'info',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), logFormat)
    }),
    // Daily rotate file transport
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

export default logger;
