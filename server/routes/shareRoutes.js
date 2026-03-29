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
 * POST /api/share/:fileId     — Create shareable link (protected)
 * GET  /api/share/:token/info — Get shared file info (public)
 * GET  /api/share/:token      — Download shared file (public)
 */

router.post('/:fileId', protect, validate(shareSchema), createShareLink);
router.get('/:token/info', getSharedFileInfo);
router.get('/:token', accessSharedFile);

module.exports = router;
