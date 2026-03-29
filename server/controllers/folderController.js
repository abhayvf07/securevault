const Folder = require('../models/Folder');
const File = require('../models/File');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

/**
 * Folder Controller
 * Handles creating and listing folders for the authenticated user.
 */

// @desc    Create a new folder
// @route   POST /api/folders
// @access  Private
const createFolder = asyncHandler(async (req, res) => {
  const { name } = req.body;

  // Check for duplicate folder name
  const existing = await Folder.findOne({
    userId: req.user._id,
    name: name.trim(),
  });

  if (existing) {
    throw new AppError('A folder with this name already exists', 409);
  }

  const folder = await Folder.create({
    name: name.trim(),
    userId: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Folder created successfully',
    data: { folder },
  });
});

// @desc    Get all folders for the user
// @route   GET /api/folders
// @access  Private
const getFolders = asyncHandler(async (req, res) => {
  const folders = await Folder.find({ userId: req.user._id })
    .sort({ createdAt: -1 });

  // Get file count per folder
  const foldersWithCount = await Promise.all(
    folders.map(async (folder) => {
      const fileCount = await File.countDocuments({ folderId: folder._id });
      return {
        ...folder.toObject(),
        fileCount,
      };
    })
  );

  res.status(200).json({
    success: true,
    count: foldersWithCount.length,
    data: { folders: foldersWithCount },
  });
});

// @desc    Delete a folder (and move its files to root)
// @route   DELETE /api/folders/:id
// @access  Private
const deleteFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findById(req.params.id);

  if (!folder) {
    throw new AppError('Folder not found', 404);
  }

  // Verify ownership
  if (folder.userId.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to delete this folder', 403);
  }

  // Move all files in this folder to root (folderId = null)
  await File.updateMany(
    { folderId: folder._id },
    { folderId: null }
  );

  await Folder.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Folder deleted. Files moved to root.',
  });
});

module.exports = { createFolder, getFolders, deleteFolder };
