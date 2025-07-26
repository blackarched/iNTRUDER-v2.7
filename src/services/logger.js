const winston = require('winston');
require('winston-daily-rotate-file');
const { AsyncLocalStorage } = require('async_hooks');

const asyncLocalStorage = new AsyncLocalStorage();

const { combine, timestamp, json, colorize, align, printf, splat, simple } = winston.format;

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
  format: combine(
    timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    splat(),
    json()
  ),
  transports: [
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

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      simple(),
      addRequestId(),
      printf(info => `${info.timestamp} [${info.requestId || 'N/A'}] ${info.level}: ${info.message}`)
    ),
  }));
}

module.exports = { logger, asyncLocalStorage };