const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const swaggerDefinition = require('./config/swagger');
const connectDB = require('./config/database');
const { metricsMiddleware, metricsEndpoint } = require('./middleware/metrics');
const createRateLimiter = require('./middleware/rateLimiter');
const securityMiddleware = require('./middleware/security');

// Load environment variables
dotenv.config();

const app = express();

// Apply security middleware
app.use(securityMiddleware);

// Basic middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(compression());

// Metrics middleware
app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);

// Rate limiting
app.use('/api/', createRateLimiter());

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling
app.use(errorHandler);

// Connect to database
connectDB();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
