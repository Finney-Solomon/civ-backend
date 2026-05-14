const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;

const getRedisClient = () => {
  if (redisClient) {
    return redisClient;
  }

  if (!config.redis.enabled) {
    logger.info('Redis is DISABLED via environment (USE_REDIS=false)');
    return null;
  }

  try {
    const uri = config.redis.uri;
    if (!uri) {
      logger.warn('Redis is enabled but REDIS_URI is missing!');
      return null;
    }

    redisClient = new Redis(uri, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times >= 3) {
          logger.error('Redis connection failed after 3 retries.');
          return null; // Stop retrying
        }
        return Math.min(times * 50, 2000);
      },
    });

    redisClient.on('connect', () => {
      logger.info('Redis Connected Successfully');
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });

    return redisClient;
  } catch (error) {
    logger.error({ error }, 'Error initializing Redis Client');
    return null;
  }
};

module.exports = getRedisClient();
