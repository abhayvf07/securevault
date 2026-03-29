const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Upload Service — Storage Abstraction Layer
 *
 * Provides a unified interface for file storage operations.
 * Supports two backends:
 *   - LOCAL (default): Files stored in /uploads directory
 *   - CLOUDINARY (optional): Files stored on Cloudinary CDN
 *
 * To switch to Cloudinary, set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
 * and CLOUDINARY_API_SECRET in your .env file.
 *
 * Usage:
 *   const uploadService = require('./services/uploadService');
 *   await uploadService.deleteFile(filePath); // Works with either backend
 */

// Detect storage backend from env
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Lazy-load Cloudinary (only if configured)
let cloudinary = null;
const getCloudinary = () => {
  if (!cloudinary) {
    try {
      const cloudinaryModule = require('cloudinary').v2;
      cloudinaryModule.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      cloudinary = cloudinaryModule;
    } catch (err) {
      logger.error('Cloudinary package not installed. Run: npm install cloudinary');
      throw new Error('Cloudinary package not installed');
    }
  }
  return cloudinary;
};

/**
 * Delete a file from storage.
 * @param {string} filePath - Local file path or Cloudinary public_id
 * @param {string} storageType - 'local' or 'cloudinary'
 */
const deleteFile = async (filePath, storageType = 'local') => {
  try {
    if (storageType === 'cloudinary' && isCloudinaryConfigured()) {
      const cloud = getCloudinary();
      // Extract public_id from the URL or path
      const publicId = filePath.split('/').pop().split('.')[0];
      await cloud.uploader.destroy(`securevault/${publicId}`);
      logger.info(`Deleted from Cloudinary: ${publicId}`);
    } else {
      // Local storage
      const resolvedPath = path.resolve(filePath);
      if (fs.existsSync(resolvedPath)) {
        fs.unlinkSync(resolvedPath);
        logger.info(`Deleted local file: ${resolvedPath}`);
      }
    }
  } catch (err) {
    logger.error(`Failed to delete file: ${err.message}`);
    // Don't throw — file cleanup failure shouldn't block DB operations
  }
};

/**
 * Upload a file to Cloudinary (if configured).
 * Falls back to local storage (Multer handles this).
 * @param {string} localPath - Path to the locally stored file
 * @param {string} folder - Cloudinary folder name
 * @returns {object} { url, publicId, storageType }
 */
const uploadToCloud = async (localPath, folder = 'securevault') => {
  if (!isCloudinaryConfigured()) {
    return {
      url: localPath,
      publicId: null,
      storageType: 'local',
    };
  }

  try {
    const cloud = getCloudinary();
    const result = await cloud.uploader.upload(localPath, {
      folder,
      resource_type: 'auto',
    });

    // Delete local temp file after cloud upload
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }

    logger.info(`Uploaded to Cloudinary: ${result.public_id}`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      storageType: 'cloudinary',
    };
  } catch (err) {
    logger.error(`Cloudinary upload failed, keeping local: ${err.message}`);
    return {
      url: localPath,
      publicId: null,
      storageType: 'local',
    };
  }
};

/**
 * Get the current storage backend type.
 * @returns {string} 'cloudinary' or 'local'
 */
const getStorageType = () => {
  return isCloudinaryConfigured() ? 'cloudinary' : 'local';
};

module.exports = {
  deleteFile,
  uploadToCloud,
  getStorageType,
  isCloudinaryConfigured,
};
