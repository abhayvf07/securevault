const fs = require('fs');
const path = require('path');
const File = require('../models/File');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const uploadService = require('../services/uploadService');

/**
 * File Controller
 * Handles file upload, listing (with pagination), download, rename, delete, and search.
 */

// @desc    Upload a file
// @route   POST /api/files/upload
// @access  Private
const uploadFile = asyncHandler(async (req, res) => {
  const { folderId } = req.body;

  // Upload to cloud if configured, otherwise keep local
  const cloudResult = await uploadService.uploadToCloud(req.file.path);

  // Create file record in database
  const file = await File.create({
    userId: req.user._id,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    filePath: cloudResult.url, // Local path or Cloudinary URL
    size: req.file.size,
    mimeType: req.file.mimetype,
    folderId: folderId || null,
    storageType: cloudResult.storageType,
  });

  // Log activity
  await ActivityLog.create({
    userId: req.user._id,
    action: 'UPLOAD',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: file.originalName,
    details: { size: file.size, mimeType: file.mimeType },
    ipAddress: req.ip,
  });

  logger.activity(req.user._id, 'UPLOAD', file.originalName, { size: file.size });

  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    data: { file },
  });
});

// @desc    Get all user files (with pagination, folder filter, search, type filter)
// @route   GET /api/files?page=1&limit=10&folderId=xxx&search=xxx&type=xxx
// @access  Private
const getFiles = asyncHandler(async (req, res) => {
  const { folderId, search, type } = req.query;

  // Pagination params (defaults: page 1, 12 per page)
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const skip = (page - 1) * limit;

  // Build query
  const query = { userId: req.user._id };

  // Filter by folder (null = root files)
  if (folderId === 'root' || folderId === 'null') {
    query.folderId = null;
  } else if (folderId) {
    query.folderId = folderId;
  }

  // Search by file name
  if (search) {
    query.originalName = { $regex: search, $options: 'i' };
  }

  // Filter by MIME type category
  if (type) {
    switch (type) {
      case 'image':
        query.mimeType = { $regex: '^image/' };
        break;
      case 'pdf':
        query.mimeType = 'application/pdf';
        break;
      case 'document':
        query.mimeType = {
          $in: [
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
          ],
        };
        break;
      default:
        break;
    }
  }

  // Get total count for pagination metadata
  const total = await File.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  // Fetch paginated results
  const files = await File.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('folderId', 'name');

  res.status(200).json({
    success: true,
    count: files.length,
    data: {
      files,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
});

// @desc    Delete a file
// @route   DELETE /api/files/:id
// @access  Private
const deleteFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Verify ownership
  if (file.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to delete this file', 403);
  }

  // Delete file from storage (local or cloud)
  await uploadService.deleteFile(file.filePath, file.storageType || 'local');

  // Delete from database
  await File.findByIdAndDelete(req.params.id);

  // Log activity
  await ActivityLog.create({
    userId: req.user._id,
    action: 'DELETE',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: file.originalName,
    ipAddress: req.ip,
  });

  logger.activity(req.user._id, 'DELETE', file.originalName);

  res.status(200).json({
    success: true,
    message: 'File deleted successfully',
  });
});

// @desc    Rename a file
// @route   PUT /api/files/:id/rename
// @access  Private
const renameFile = asyncHandler(async (req, res) => {
  const { newName } = req.body;
  const file = await File.findById(req.params.id);

  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Verify ownership
  if (file.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to rename this file', 403);
  }

  const oldName = file.originalName;
  file.originalName = newName;
  await file.save();

  // Log activity
  await ActivityLog.create({
    userId: req.user._id,
    action: 'RENAME',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: newName,
    details: { oldName, newName },
    ipAddress: req.ip,
  });

  logger.activity(req.user._id, 'RENAME', `${oldName} → ${newName}`);

  res.status(200).json({
    success: true,
    message: 'File renamed successfully',
    data: { file },
  });
});

// @desc    Download a file
// @route   GET /api/files/download/:id
// @access  Private
const downloadFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);

  if (!file) {
    throw new AppError('File not found', 404);
  }

  // Verify ownership
  if (file.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to download this file', 403);
  }

  // Verify file exists on disk
  const filePath = path.resolve(file.filePath);
  if (!fs.existsSync(filePath)) {
    throw new AppError('File not found on server', 404);
  }

  // Log activity
  await ActivityLog.create({
    userId: req.user._id,
    action: 'DOWNLOAD',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: file.originalName,
    ipAddress: req.ip,
  });

  logger.activity(req.user._id, 'DOWNLOAD', file.originalName);

  // Stream file download with original name
  res.download(filePath, file.originalName);
});

module.exports = { uploadFile, getFiles, deleteFile, renameFile, downloadFile };
