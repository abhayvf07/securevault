const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

/**
 * Log user activity in the database and write to system logger
 * @param {Object} params - Activity parameters
 */
exports.logUserActivity = async ({ userId, action, resourceType, resourceId, resourceName, ipAddress, details }) => {
  await ActivityLog.create({
    userId,
    action,
    resourceType,
    resourceId,
    resourceName,
    ipAddress,
    ...(details && { details })
  });

  // Specifically for files, we also use the structured logger activity method
  if (resourceType === 'file') {
    logger.activity(userId, action, resourceName, details);
  }
};
