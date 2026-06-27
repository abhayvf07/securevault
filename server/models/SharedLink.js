const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * SharedLink Model
 * Enables file sharing via unique token-based URLs.
 *
 * Features:
 * - Token-based access (UUID)
 * - Optional expiry date
 * - Optional password protection (hashed with bcrypt)
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
 * Pre-save hook: Hash password if modified
 * Ensures password is always hashed, regardless of code path
 */
sharedLinkSchema.pre('save', async function (next) {
  // Only hash if password is new or modified
  if (!this.isModified('password')) {
    return next();
  }

  // Skip if password is null (no password set)
  if (!this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Instance method: Compare password against hash
 * @param {string} candidatePassword - Plain text password to verify
 * @returns {Promise<boolean>} True if password matches
 */
sharedLinkSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Check if the shared link is still valid.
 * Note: For concurrent downloads, use the static increment method below to avoid race conditions.
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

/**
 * Static method: Atomically check validity and increment download count.
 * Prevents race conditions when multiple users download at the same exact time.
 * @param {mongoose.Types.ObjectId | string} linkId - The ID of the shared link
 * @returns {Promise<object|null>} The updated link document, or null if expired/limit reached
 */
sharedLinkSchema.statics.incrementDownloadIfValid = async function (linkId) {
  // 'this' refers to the SharedLink model in static methods
  return await this.findOneAndUpdate(
    {
      _id: linkId,
      $and: [
        // Condition 1: No limit OR current count is less than the limit
        {
          $or: [
            { downloadLimit: null },
            { $expr: { $lt: ['$downloadCount', '$downloadLimit'] } },
          ],
        },
        // Condition 2: No expiry OR expiry is in the future
        {
          $or: [
            { expiryDate: null },
            { expiryDate: { $gt: new Date() } },
          ],
        },
      ],
    },
    { $inc: { downloadCount: 1 } },
    { new: true }
  );
};

module.exports = mongoose.model('SharedLink', sharedLinkSchema);