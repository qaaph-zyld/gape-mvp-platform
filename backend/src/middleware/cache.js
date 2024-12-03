const redis = require('../config/redis');
const logger = require('../config/logger');

const cache = (duration) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cachedResponse = await redis.get(key);

      if (cachedResponse) {
        logger.debug(`Cache hit for ${key}`);
        return res.json(JSON.parse(cachedResponse));
      }

      // Store the original res.json function
      const originalJson = res.json;

      // Override res.json method to cache the response
      res.json = function(body) {
        redis.setex(key, duration, JSON.stringify(body))
          .catch(err => logger.error('Redis cache error:', err));
        
        return originalJson.call(this, body);
      };

      logger.debug(`Cache miss for ${key}`);
      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

const clearCache = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
      logger.info(`Cleared cache for pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error('Error clearing cache:', error);
  }
};

module.exports = {
  cache,
  clearCache
};
