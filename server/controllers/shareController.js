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

const createShareLink = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.fileId);

  if (!file) {
    throw new AppError('File not found', 404);
  }

  if (file.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to share this file', 403);
  }

  const { expiryHours, password, downloadLimit } = req.body;

  const linkData = {
    fileId: file._id,
    token: uuidv4(),
    createdBy: req.user._id,
    password: password || null,
  };

  if (expiryHours) {
    linkData.expiryDate = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  }

  if (downloadLimit) {
    linkData.downloadLimit = downloadLimit;
  }

  const sharedLink = await SharedLink.create(linkData);

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

const getSharedFileInfo = asyncHandler(async (req, res) => {
  const sharedLink = await SharedLink.findOne({ token: req.params.token }).populate({
    path: 'fileId',
    select: 'originalName size mimeType',
  });

  if (!sharedLink) {
    throw new AppError('Shared link not found or invalid', 404);
  }

  if (!sharedLink.fileId) {
    throw new AppError('The file associated with this link no longer exists', 404);
  }

  const validity = sharedLink.isValid();
  if (!validity.valid) {
    throw new AppError(validity.reason, 410);
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

const accessSharedFile = asyncHandler(async (req, res) => {
  const sharedLink = await SharedLink.findOne({ token: req.params.token }).populate('fileId');

  if (!sharedLink) {
    throw new AppError('Shared link not found or invalid', 404);
  }

  if (!sharedLink.fileId) {
    throw new AppError('The file associated with this link no longer exists', 404);
  }

  const validity = sharedLink.isValid();
  if (!validity.valid) {
    throw new AppError(validity.reason, 410);
  }

  if (sharedLink.password) {
    const password = req.body?.password;

    if (!password) {
      throw new AppError('This shared file is password protected. Provide a password in the request body', 401);
    }

    const isMatch = await sharedLink.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Incorrect password', 401);
    }
  }

  const file = sharedLink.fileId;

  await SharedLink.findByIdAndUpdate(sharedLink._id, {
    $inc: { downloadCount: 1 },
  });

  logger.activity('anonymous', 'DOWNLOAD', file.originalName, {
    via: 'shared-link',
    token: sharedLink.token,
  });

  if (file.storageType === 'cloudinary' && file.filePath?.startsWith('http')) {
    await streamRemoteFile(file.filePath, res, file.originalName);
    return;
  }

  const uploadsDir = path.resolve(__dirname, '..', 'uploads');
  const filePath = path.resolve(file.filePath);

  if (!filePath.startsWith(uploadsDir + path.sep)) {
    throw new AppError('Invalid file path', 403);
  }

  if (!fs.existsSync(filePath)) {
    throw new AppError('File no longer exists on server', 404);
  }

  res.download(filePath, file.originalName);
});

module.exports = { createShareLink, getSharedFileInfo, accessSharedFile };