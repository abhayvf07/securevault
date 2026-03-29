const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate a short-lived JWT access token.
 * Used for API authentication (15 minutes).
 *
 * @param {string} userId - The MongoDB ObjectId of the user
 * @returns {string} Signed JWT access token
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

/**
 * Generate a long-lived refresh token.
 * Used to obtain new access tokens without re-login (7 days).
 * Uses crypto.randomBytes for unpredictable token generation.
 *
 * @returns {string} Random hex string (64 chars)
 */
const generateRefreshToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Keep backward-compatible default export for existing code
const generateToken = generateAccessToken;

module.exports = generateToken;
module.exports.generateAccessToken = generateAccessToken;
module.exports.generateRefreshToken = generateRefreshToken;
