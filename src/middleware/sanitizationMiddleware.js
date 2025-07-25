const sanitize = require('sanitize-html');

const sanitizeOptions = {
  allowedTags: [],
  allowedAttributes: {},
};

const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key], sanitizeOptions);
      }
    }
  }
  if (req.query) {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitize(req.query[key], sanitizeOptions);
      }
    }
  }
  if (req.params) {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitize(req.params[key], sanitizeOptions);
      }
    }
  }
  next();
};

module.exports = sanitizeMiddleware;
