const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const File = require('../models/File');
const SharedLink = require('../models/SharedLink');
const logger = require('../utils/logger');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { streamRemoteFile } = require('../utils/streamRemoteFile');
const { logUserActivity } = require('../services/activityService');

/**
 * Share Controller
 * Handles creating shareable links and accessing shared files.
 * Supports optional expiry, password protection, and download limits.
 */

// @desc    Create a shareable link for a file
// @route   POST /api/share/:fileId
// @access  Private
const createShareLink = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.fileId);

  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Verify ownership
  if (file.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to share this file', 403);
  }

  const { expiryHours, password, downloadLimit } = req.body;

  // Build shared link data
  const linkData = {
    fileId: file._id,
    token: uuidv4(),
    createdBy: req.user._id,
    password: password || null, // Will be hashed by pre-save hook if provided
  };

  // Set expiry if provided
  if (expiryHours) {
    linkData.expiryDate = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  }

  // Set download limit if provided
  if (downloadLimit) {
    linkData.downloadLimit = downloadLimit;
  }

  const sharedLink = await SharedLink.create(linkData);

  // Log activity
  await logUserActivity({
    userId: req.user._id,
    action: 'SHARE',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: file.originalName,
    ipAddress: req.ip,
    details: {
      token: sharedLink.token,
      hasExpiry: !!expiryHours,
      hasPassword: !!password,
      downloadLimit: downloadLimit || 'unlimited',
    },
  });

  // Build shareable URL
  const shareUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/shared/${sharedLink.token}`;

  res.status(201).json({
    success: true,
    message: 'Share link created successfully',
    data: {
      shareUrl,
      token: sharedLink.token,
      expiryDate: sharedLink.expiryDate,
      hasPassword: !!password,
      downloadLimit: sharedLink.downloadLimit,
    },
  });
});

// @desc    Get shared file info (without downloading)
// @route   GET /api/share/:token/info
// @access  Public
const getSharedFileInfo = asyncHandler(async (req, res) => {
  const sharedLink = await SharedLink.findOne({ token: req.params.token })
    .populate({
      path: 'fileId',
      select: 'originalName size mimeType',
    });

  if (!sharedLink) {
    throw new AppError('Shared link not found or invalid', 404);
  }

  // Check if referenced file still exists
  if (!sharedLink.fileId) {
    throw new AppError('The file associated with this link no longer exists', 404);
  }

  // Check validity
  const validity = sharedLink.isValid();
  if (!validity.valid) {
    throw new AppError(validity.reason, 410); // 410 Gone
  }

  res.status(200).json({
    success: true,
    data: {
      fileName: sharedLink.fileId.originalName,
      fileSize: sharedLink.fileId.size,
      mimeType: sharedLink.fileId.mimeType,
      hasPassword: !!sharedLink.password,
      expiryDate: sharedLink.expiryDate,
      downloadsRemaining: sharedLink.downloadLimit
        ? sharedLink.downloadLimit - sharedLink.downloadCount
        : null,
    },
  });
});

// @desc    Download a shared file
// @route   GET /api/share/:token
// @access  Public
const accessSharedFile = asyncHandler(async (req, res) => {
  const sharedLink = await SharedLink.findOne({ token: req.params.token })
    .populate('fileId');

  if (!sharedLink) {
    throw new AppError('Shared link not found or invalid', 404);
  }

  // Check if referenced file still exists
  if (!sharedLink.fileId) {
    throw new AppError('The file associated with this link no longer exists', 404);
  }

  // Check validity (expiry + download limit)
  const validity = sharedLink.isValid();
  if (!validity.valid) {
    throw new AppError(validity.reason, 410);
  }

  // Check password if protected
  if (sharedLink.password) {
    const password = req.body?.password;

    if (!password) {
      throw new AppError('This shared file is password protected. Provide a password in the request body', 401);
    }

    // Use model's comparePassword method for password validation
    const isMatch = await sharedLink.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Incorrect password', 401);
    }
  }

  const file = sharedLink.fileId;

  // Increment download count securely avoiding race conditions
  await SharedLink.findByIdAndUpdate(sharedLink._id, {
    $inc: { downloadCount: 1 }
  });

  logger.activity('anonymous', 'DOWNLOAD', file.originalName, {
    via: 'shared-link',
    token: sharedLink.token,
  });

  if (file.storageType === 'cloudinary' && file.filePath?.startsWith('http')) {
    await streamRemoteFile(file.filePath, res, file.originalName);
    return;
  }

  // Verify file exists on disk
  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  const filePath = path.resolve(file.filePath);
  
  if (!filePath.startsWith(uploadsDir + path.sep)) {
    throw new AppError('Invalid file path', 403);
  }

  if (!fs.existsSync(filePath)) {
    throw new AppError('File no longer exists on server', 404);
  }

  // Stream file download
  res.download(filePath, file.originalName);
});

module.exports = { createShareLink, getSharedFileInfo, accessSharedFile };
