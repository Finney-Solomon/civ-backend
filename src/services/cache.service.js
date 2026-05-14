const redisClient = require('../config/redis');
const logger = require('../utils/logger');

const get = async (key) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error({ error, key }, 'Redis GET Error');
    return null;
  }
};

const set = async (key, value, expiryInSeconds = 900) => {
  if (!redisClient) return;
  try {
    await redisClient.set(key, JSON.stringify(value), 'EX', expiryInSeconds);
  } catch (error) {
    logger.error({ error, key }, 'Redis SET Error');
  }
};

const delByPattern = async (pattern) => {
  if (!redisClient) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    logger.error({ error, pattern }, 'Redis DEL Error');
  }
};

const del = async (key) => {
  if (!redisClient) return;
  try {
    await redisClient.del(key);
  } catch (error) {
    logger.error({ error, key }, 'Redis DEL Error');
  }
};

module.exports = {
  get,
  set,
  delByPattern,
  del,
};
