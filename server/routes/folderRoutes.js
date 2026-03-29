const express = require('express');
const router = express.Router();
const { createFolder, getFolders, deleteFolder } = require('../controllers/folderController');
const { protect } = require('../middleware/auth');
const { validate, folderSchema } = require('../middleware/validate');

/**
 * Folder Routes (all protected)
 * POST   /api/folders      — Create a new folder
 * GET    /api/folders       — Get all user folders
 * DELETE /api/folders/:id   — Delete a folder
 */

router.post('/', protect, validate(folderSchema), createFolder);
router.get('/', protect, getFolders);
router.delete('/:id', protect, deleteFolder);

module.exports = router;
