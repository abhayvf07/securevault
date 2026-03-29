const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const File = require('../models/File');
const SharedLink = require('../models/SharedLink');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

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
  };

  // Set expiry if provided
  if (expiryHours) {
    linkData.expiryDate = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  }

  // Hash password if provided (don't store in plain text)
  if (password) {
    const salt = await bcrypt.genSalt(10);
    linkData.password = await bcrypt.hash(password, salt);
  }

  // Set download limit if provided
  if (downloadLimit) {
    linkData.downloadLimit = downloadLimit;
  }

  const sharedLink = await SharedLink.create(linkData);

  // Log activity
  await ActivityLog.create({
    userId: req.user._id,
    action: 'SHARE',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: file.originalName,
    details: {
      token: sharedLink.token,
      hasExpiry: !!expiryHours,
      hasPassword: !!password,
      downloadLimit: downloadLimit || 'unlimited',
    },
    ipAddress: req.ip,
  });

  logger.activity(req.user._id, 'SHARE', file.originalName, {
    token: sharedLink.token,
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

  // Check validity (expiry + download limit)
  const validity = sharedLink.isValid();
  if (!validity.valid) {
    throw new AppError(validity.reason, 410);
  }

  // Check password if protected
  if (sharedLink.password) {
    const { password } = req.query; // Pass password as query param for download

    if (!password) {
      throw new AppError('This shared file is password protected. Provide password', 401);
    }

    const isMatch = await bcrypt.compare(password, sharedLink.password);
    if (!isMatch) {
      throw new AppError('Incorrect password', 401);
    }
  }

  const file = sharedLink.fileId;

  // Verify file exists on disk
  const filePath = path.resolve(file.filePath);
  if (!fs.existsSync(filePath)) {
    throw new AppError('File no longer exists on server', 404);
  }

  // Increment download count
  sharedLink.downloadCount += 1;
  await sharedLink.save();

  logger.activity('anonymous', 'DOWNLOAD', file.originalName, {
    via: 'shared-link',
    token: sharedLink.token,
  });

  // Stream file download
  res.download(filePath, file.originalName);
});

module.exports = { createShareLink, getSharedFileInfo, accessSharedFile };
