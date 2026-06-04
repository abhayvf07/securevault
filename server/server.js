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

const DEFAULT_PORT = 5000;
const initialPort = Number(process.env.PORT) || DEFAULT_PORT;

const listenOnPort = (port) =>
  new Promise((resolve, reject) => {
    const server = app
      .listen(port)
      .once('listening', () => resolve({ server, port }))
      .once('error', (error) => reject(error));
  });

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.success(`MongoDB connected: ${mongoose.connection.host}`);

    let port = initialPort;
    while (true) {
      try {
        const { server, port: boundPort } = await listenOnPort(port);
        logger.success(`Server running in ${process.env.NODE_ENV} mode on port ${boundPort}`);
        logger.info(`API:    http://localhost:${boundPort}/api`);
        logger.info(`Health: http://localhost:${boundPort}/api/health`);
        server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${boundPort} is already in use.`);
          } else {
            logger.error(`Server error: ${error.message}`);
          }
          process.exit(1);
        });
        break;
      } catch (error) {
        if (error.code === 'EADDRINUSE') {
          if (process.env.PORT) {
            logger.warn(`Port ${port} is already in use; falling back to ${port + 1}.`);
          } else {
            logger.warn(`Port ${port} is in use, trying ${port + 1}...`);
          }
          port += 1;
          continue;
        }
        throw error;
      }
    }
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err?.message || String(err)}`);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err?.message || String(err)}`);
  process.exit(1);
});

startServer();
