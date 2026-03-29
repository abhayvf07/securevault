const mongoose = require('mongoose');

/**
 * File Model
 * Stores metadata for uploaded files. Actual files live on disk in /uploads.
 * Each file belongs to a user and optionally to a folder.
 * The `isPublic` flag controls whether a file can be accessed without auth.
 */
const fileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      unique: true, // UUID-generated, guaranteed unique
    },
    originalName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
      default: null, // null = root level (no folder)
    },
    isPublic: {
      type: Boolean,
      default: false, // Private by default — only owner can access
    },
    storageType: {
      type: String,
      enum: ['local', 'cloudinary'],
      default: 'local',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries: get user's files, optionally filtered by folder
fileSchema.index({ userId: 1, folderId: 1 });

// Text index for search functionality
fileSchema.index({ originalName: 'text' });

module.exports = mongoose.model('File', fileSchema);
