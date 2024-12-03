const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const Redis = require('ioredis');
const lusca = require('lusca');
const logger = require('../config/logger');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

// Redis session store
const sessionStore = new RedisStore({
  client: redisClient,
  prefix: 'session:',
});

// Session configuration
const sessionConfig = {
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'your-super-secret-key',
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'strict',
  },
};

// Security middleware configuration
const securityMiddleware = [
  // Helmet security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'same-site' },
    dnsPrefetchControl: { allow: false },
    expectCt: { enforce: true, maxAge: 30 },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'same-origin' },
    xssFilter: true,
  }),

  // Data sanitization
  mongoSanitize({
    replaceWith: '_',
  }),
  xss(),

  // Prevent parameter pollution
  hpp({
    whitelist: [], // Add parameters that are allowed to be duplicated
  }),

  // Cookie parser for CSRF
  cookieParser(),

  // Session management
  session(sessionConfig),

  // CSRF protection
  csrf({ cookie: true }),

  // Additional security headers with Lusca
  lusca({
    csrf: true,
    csp: { policy: ['default-src "self"'] },
    xframe: 'DENY',
    p3p: 'ABCDEF',
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    xssProtection: true,
    nosniff: true,
    referrerPolicy: 'same-origin',
  }),

  // Error handler for CSRF
  (err, req, res, next) => {
    if (err.code !== 'EBADCSRFTOKEN') return next(err);
    logger.error('CSRF token validation failed');
    return res.status(403).json({
      status: 'error',
      message: 'Invalid or missing CSRF token',
    });
  },
];

module.exports = securityMiddleware;
