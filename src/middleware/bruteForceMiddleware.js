const ExpressBrute = require('express-brute');
const RedisStore = require('express-brute-redis');
const config = require('../../config');

const store = new RedisStore({
  host: config.redis.host,
  port: config.redis.port,
});

const bruteforce = new ExpressBrute(store, {
  freeRetries: 5,
  minWait: 5 * 60 * 1000, // 5 minutes
  maxWait: 60 * 60 * 1000, // 1 hour
});

module.exports = bruteforce;
