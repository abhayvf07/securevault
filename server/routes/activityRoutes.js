const express = require('express');
const router = express.Router();
const { getActivityLogs, getAnalytics } = require('../controllers/activityController');
const { protect } = require('../middleware/auth');

/**
 * Activity Routes (all protected)
 * GET /api/activity           — Get paginated activity logs (?page, ?limit, ?action)
 * GET /api/activity/analytics — Get storage analytics dashboard data
 */

router.get('/analytics', protect, getAnalytics);
router.get('/', protect, getActivityLogs);

module.exports = router;
