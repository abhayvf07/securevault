const mongoose = require('mongoose');

/**
 * RefreshToken Model
 * Stores long-lived refresh tokens for JWT rotation.
 *
 * Flow:
 * 1. On login/register → access token (15min) + refresh token (7d) issued
 * 2. On access token expiry → client sends refresh token to get new access token
 * 3. On logout → refresh token is deleted from DB
 *
 * Security: Refresh tokens are stored hashed and auto-expire via TTL index.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: MongoDB automatically deletes expired tokens
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
