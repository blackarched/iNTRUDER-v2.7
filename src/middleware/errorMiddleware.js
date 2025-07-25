const logger = require('../services/logger');

module.exports = (err, req, res, next) => {
  if (err.isJoi) {
    return res.status(400).json({
      type: 'Validation Error',
      details: err.details.map((d) => d.message),
    });
  }

  if (err.code === '23505') { // Unique constraint violation in Postgres
    return res.status(409).json({
      type: 'Conflict',
      message: 'A record with the provided information already exists.',
    });
  }

  // Log the error for debugging purposes
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    return res.status(500).json({ error: 'An unexpected error occurred.' });
  }
  
  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
  });
};