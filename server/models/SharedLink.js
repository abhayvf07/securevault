const mongoose = require('mongoose');

/**
 * SharedLink Model
 * Enables file sharing via unique token-based URLs.
 *
 * Features:
 * - Token-based access (UUID)
 * - Optional expiry date
 * - Optional password protection
 * - Optional download limit (tracks remaining downloads)
 */
const sharedLinkSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true, // Fast lookups for shared link access
    },
    expiryDate: {
      type: Date,
      default: null, // null = no expiry (link lives forever)
    },
    password: {
      type: String,
      default: null, // null = no password required
    },
    downloadLimit: {
      type: Number,
      default: null, // null = unlimited downloads
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Check if the shared link is still valid.
 * @returns {object} { valid: boolean, reason?: string }
 */
sharedLinkSchema.methods.isValid = function () {
  // Check expiry
  if (this.expiryDate && new Date() > this.expiryDate) {
    return { valid: false, reason: 'Link has expired' };
  }

  // Check download limit
  if (this.downloadLimit !== null && this.downloadCount >= this.downloadLimit) {
    return { valid: false, reason: 'Download limit reached' };
  }

  return { valid: true };
};

module.exports = mongoose.model('SharedLink', sharedLinkSchema);
