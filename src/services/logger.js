const winston = require('winston');
require('winston-daily-rotate-file');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

const { combine, timestamp, json, colorize, align, printf } = winston.format;

// Configuration for logging to rotating files
const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: 'logs/nexus-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d'
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  // Use JSON format for file logs
  format: combine(
    timestamp(),
    json()
  ),
  transports: [
    // Always log to rotating files
    fileRotateTransport
  ],
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ]
});

const addRequestId = winston.format((info) => {
  const requestId = asyncLocalStorage.getStore();
  if (requestId) {
    info.requestId = requestId;
  }
  return info;
});

// For development, add a human-readable console logger
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      addRequestId(),
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      align(),
      printf(info => `${info.timestamp} [${info.requestId || 'N/A'}] ${info.level}: ${info.message}`)
    ),
  }));
}

module.exports = { logger, asyncLocalStorage };