const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    const options = {
      maxPoolSize: 100,
      minPoolSize: 10,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4,
      keepAlive: true,
      keepAliveInitialDelay: 300000
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Create indexes
    await createIndexes();

    // Monitor connection events
    mongoose.connection.on('error', err => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const User = mongoose.model('User');
    
    // Create indexes for User model
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ createdAt: 1 });
    await User.collection.createIndex({ role: 1 });

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes:', error);
  }
};

module.exports = connectDB;
