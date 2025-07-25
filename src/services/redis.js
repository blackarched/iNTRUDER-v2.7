const redis = require('redis');
const logger = require('./logger');
const config = require('../../config');

const redisClient = redis.createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`,
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error(`Redis error: ${err}`);
});

redisClient.connect();

module.exports = redisClient;
