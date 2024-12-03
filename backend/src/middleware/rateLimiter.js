const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('../config/redis');
const logger = require('../config/logger');

const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // Limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later'
  } = options;

  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: 'rate-limit:',
      resetExpiryOnChange: true
    }),
    windowMs,
    max,
    message,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    },
    skip: (req) => {
      // Skip rate limiting for certain trusted IPs or admin users
      return req.user && req.user.role === 'admin';
    },
    keyGenerator: (req) => {
      // Use X-Forwarded-For header if behind a proxy, otherwise use IP
      return req.headers['x-forwarded-for'] || req.ip;
    }
  });
};

module.exports = createRateLimiter;
