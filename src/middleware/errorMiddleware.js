const logger = require('../services/logger');

module.exports = (err, req, res, next) => {
  // Joi validation error
  if (err.isJoi) {
    return res.status(400).json({
      type: 'Validation Error',
      details: err.details.map(d => d.message),
    });
  }
  
  logger.error(err.message, { stack: err.stack });
  
  if (res.headersSent) {
    return next(err);
  }
  
  return res.status(500).json({ error: 'Internal Server Error' });
};