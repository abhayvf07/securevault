const mongoose = require('mongoose');

/**
 * Folder Model
 * Basic flat folder structure (single level, no nesting).
 * Each folder belongs to a user. Files reference folders via folderId.
 *
 * NOTE: Currently supports single-level folders.
 * Can be extended to nested structure by adding a `parentId` field
 * referencing another Folder document (adjacency list pattern).
 */
const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      maxlength: [100, 'Folder name cannot exceed 100 characters'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate folder names per user
folderSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Folder', folderSchema);
