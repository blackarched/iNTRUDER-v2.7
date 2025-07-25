const Joi = require('joi');
const logger = require('../services/logger');

// This middleware factory creates a validation middleware for a given schema.
const validatorMiddleware = (schema) => {
    return (req, res, next) => {
        // We validate the request body, query parameters, and URL parameters.
        const { error } = schema.validate(
            {
                body: req.body,
                query: req.query,
                params: req.params,
            },
            { abortEarly: false } // Report all errors, not just the first one
        );

        if (error) {
            logger.warn('Validation failed for incoming request', {
                details: error.details.map((d) => d.message),
                url: req.originalUrl,
            });
            // Pass the Joi error to the global error handler for a standardized response.
            error.isJoi = true;
            return next(error);
        }

        next();
    };
};

module.exports = validatorMiddleware;