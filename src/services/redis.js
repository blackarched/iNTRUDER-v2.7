const redis = require('redis');
const { logger } = require('./logger');
const config = require('../../config');

let redisClient;
let retryCount = 0;
const maxRetries = 5;

function connectToRedis() {
  redisClient = redis.createClient({
    url: `redis://${config.redis.host}:${config.redis.port}`,
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
    retryCount = 0;
  });

  redisClient.on('error', (err) => {
    logger.error(`Redis error: ${err}`);
    if (retryCount < maxRetries) {
      const retryDelay = Math.pow(2, retryCount) * 1000;
      logger.info(`Retrying Redis connection in ${retryDelay / 1000} seconds...`);
      setTimeout(connectToRedis, retryDelay);
      retryCount++;
    } else {
      logger.error('Max retries reached. Could not connect to Redis.');
    }
  });

  redisClient.connect();
}

connectToRedis();

module.exports = redisClient;
