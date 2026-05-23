const express = require('express');
const router = express.Router();
const {
  createShareLink,
  getSharedFileInfo,
  accessSharedFile,
} = require('../controllers/shareController');
const { protect } = require('../middleware/auth');
const { validate, shareSchema } = require('../middleware/validate');

/**
 * Share Routes
 * POST /api/share/:fileId          — Create shareable link (protected)
 * GET  /api/share/:token/info      — Get shared file info (public)
 * POST /api/share/:token/download  — Download shared file (public, supports password)
 * GET  /api/share/:token           — Get the shared file directly (public, no password supported)
 */

router.post('/:fileId', protect, validate(shareSchema), createShareLink);
router.get('/:token/info', getSharedFileInfo);
router.post('/:token/download', accessSharedFile);
router.get('/:token', accessSharedFile);

module.exports = router;
