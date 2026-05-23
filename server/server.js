const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Load environment variables
dotenv.config();

const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
if (process.env.NODE_ENV === 'production') {
  requiredEnv.push('CLIENT_URL');
}
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  logger.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = require('./app');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Created uploads directory');
}

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.success(`MongoDB connected: ${mongoose.connection.host}`);

    app.listen(PORT, () => {
      logger.success(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      logger.info(`API:    http://localhost:${PORT}/api`);
      logger.info(`Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

startServer();
