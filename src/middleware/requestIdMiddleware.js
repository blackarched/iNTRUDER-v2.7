const { randomUUID } = require('crypto');
const { asyncLocalStorage } = require('../services/logger');

const requestIdMiddleware = (req, res, next) => {
  asyncLocalStorage.run(randomUUID(), () => {
    next();
  });
};

module.exports = requestIdMiddleware;
