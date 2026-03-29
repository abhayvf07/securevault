/**
 * Simple activity logger utility.
 * Logs user actions to console with timestamps.
 * In production, this would write to a logging service or file.
 */

const chalk = {
  info: (msg) => `\x1b[36m[INFO]\x1b[0m ${msg}`,
  warn: (msg) => `\x1b[33m[WARN]\x1b[0m ${msg}`,
  error: (msg) => `\x1b[31m[ERROR]\x1b[0m ${msg}`,
  success: (msg) => `\x1b[32m[SUCCESS]\x1b[0m ${msg}`,
};

const logger = {
  info: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${chalk.info(message)}`, meta);
  },

  warn: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`${timestamp} ${chalk.warn(message)}`, meta);
  },

  error: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`${timestamp} ${chalk.error(message)}`, meta);
  },

  success: (message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} ${chalk.success(message)}`, meta);
  },

  /**
   * Log a user activity (file upload, download, delete, share, etc.)
   * @param {string} userId - User who performed the action
   * @param {string} action - Action type (e.g., 'UPLOAD', 'DOWNLOAD', 'DELETE', 'SHARE')
   * @param {string} resource - Resource affected (e.g., file name)
   * @param {object} details - Additional details
   */
  activity: (userId, action, resource, details = {}) => {
    const timestamp = new Date().toISOString();
    console.log(
      `${timestamp} \x1b[35m[ACTIVITY]\x1b[0m User:${userId} Action:${action} Resource:${resource}`,
      details
    );
  },
};

module.exports = logger;
