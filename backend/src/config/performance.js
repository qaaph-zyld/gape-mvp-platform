const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const responseTime = require('response-time');
const { promisify } = require('util');
const redis = require('./redis');

// Promisify Redis commands
const redisGet = promisify(redis.get).bind(redis);
const redisSet = promisify(redis.set).bind(redis);

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Cache middleware
const cache = async (req, res, next) => {
  try {
    const key = req.originalUrl;
    const cachedResponse = await redisGet(key);

    if (cachedResponse) {
      return res.json(JSON.parse(cachedResponse));
    }

    res.sendResponse = res.json;
    res.json = async (body) => {
      await redisSet(key, JSON.stringify(body), 'EX', 300); // Cache for 5 minutes
      res.sendResponse(body);
    };
    next();
  } catch (error) {
    next(error);
  }
};

// Database query optimization
const optimizeQuery = (query) => {
  // Add necessary indexes
  if (query.sort) {
    // Ensure indexes exist for sorted fields
  }
  
  // Limit fields if not specified
  if (!query.select) {
    query.select('-__v');
  }
  
  // Add pagination if not present
  if (!query.limit) {
    query.limit = 10;
  }
  
  return query;
};

// Performance monitoring middleware
const performanceMonitor = responseTime((req, res, time) => {
  // Log response time
  console.log(`${req.method} ${req.url} - ${time}ms`);
  
  // Add response time to metrics
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service
  }
});

// Export configuration
module.exports = {
  middleware: [
    helmet(), // Security headers
    compression(), // Compress responses
    mongoSanitize(), // Prevent NoSQL injection
    limiter, // Rate limiting
    performanceMonitor, // Response time monitoring
  ],
  cache,
  optimizeQuery,
};
