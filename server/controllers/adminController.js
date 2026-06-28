const User = require('../models/User');
const File = require('../models/File');
const SharedLink = require('../models/SharedLink');
const { logUserActivity } = require('../services/activityService');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const uploadService = require('../services/uploadService');

/**
 * Admin Controller
 * Handles user management, file oversight, and platform-wide admin actions.
 * All endpoints require admin role (enforced via requireAdmin middleware).
 *
 * Design notes:
 * - Self-targeting is blocked on status/role changes to prevent lockout.
 * - The last admin can't be demoted by anyone.
 * - Every action is audit-logged with the admin as actor.
 */

// @desc    Get all users (paginated, searchable)
// @route   GET /api/admin/users
// @access  Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;

  const query = search
    ? {
        $or: [
          { name: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
        ],
      }
    : {};

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      users,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Update user account status (suspend / activate / disable)
// @route   PATCH /api/admin/users/:id/status
// @access  Admin
const updateUserStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  // Block self-targeting — admin can't suspend themselves
  if (req.params.id === req.user._id.toString()) {
    throw new AppError("You can't change your own account status", 400);
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).select('-password');

  if (!user) throw new AppError('User not found', 404);

  await logUserActivity({
    userId: req.user._id,
    action: status === 'active' ? 'ACTIVATE_USER' : 'SUSPEND_USER',
    resourceType: 'user',
    resourceId: user._id,
    resourceName: user.email,
    details: { newStatus: status },
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: `User ${status}`,
    data: { user },
  });
});

// @desc    Update user role (promote / demote)
// @route   PATCH /api/admin/users/:id/role
// @access  Admin
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  // Block self-targeting — admin can't change their own role
  if (req.params.id === req.user._id.toString()) {
    throw new AppError("You can't change your own role", 400);
  }

  // Don't allow demoting the last remaining admin
  if (role === 'user') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    const target = await User.findById(req.params.id);
    if (target?.role === 'admin' && adminCount <= 1) {
      throw new AppError('Cannot demote the last remaining admin', 400);
    }
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  ).select('-password');

  if (!user) throw new AppError('User not found', 404);

  await logUserActivity({
    userId: req.user._id,
    action: role === 'admin' ? 'PROMOTE_ADMIN' : 'DEMOTE_ADMIN',
    resourceType: 'user',
    resourceId: user._id,
    resourceName: user.email,
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: `User role set to ${role}`,
    data: { user },
  });
});

// @desc    Get all files across all users (admin oversight)
// @route   GET /api/admin/files
// @access  Admin
const getAllFiles = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;

  const query = search
    ? { originalName: { $regex: search, $options: 'i' } }
    : {};

  const files = await File.find(query)
    .populate('userId', 'name email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  const total = await File.countDocuments(query);

  res.status(200).json({
    success: true,
    data: {
      files,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    },
  });
});

// @desc    Admin delete file (bypasses ownership check)
// @route   DELETE /api/admin/files/:id
// @access  Admin
const adminDeleteFile = asyncHandler(async (req, res) => {
  const file = await File.findById(req.params.id);
  if (!file) throw new AppError('File not found', 404);

  // Delete from storage (local or cloud)
  await uploadService.deleteFile(file.filePath, file.storageType || 'local', file.publicId);

  // Clean up any shared links referencing this file
  await SharedLink.deleteMany({ fileId: file._id });

  // Delete from database
  await File.findByIdAndDelete(req.params.id);

  await logUserActivity({
    userId: req.user._id,
    action: 'ADMIN_DELETE_FILE',
    resourceType: 'file',
    resourceId: file._id,
    resourceName: file.originalName,
    details: { originalOwnerId: file.userId },
    ipAddress: req.ip,
  });

  res.status(200).json({
    success: true,
    message: 'File deleted by admin',
  });
});

// @desc    Get platform-wide stats for admin dashboard
// @route   GET /api/admin/stats
// @access  Admin
const getAdminStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalFiles, totalStorage, statusCounts, roleCounts] = await Promise.all([
    User.countDocuments(),
    File.countDocuments(),
    File.aggregate([{ $group: { _id: null, total: { $sum: '$size' } } }]),
    User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
  ]);

  const statusMap = {};
  statusCounts.forEach((s) => { statusMap[s._id] = s.count; });

  const roleMap = {};
  roleCounts.forEach((r) => { roleMap[r._id] = r.count; });

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalFiles,
      totalStorage: totalStorage[0]?.total || 0,
      usersByStatus: statusMap,
      usersByRole: roleMap,
    },
  });
});

module.exports = {
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  getAllFiles,
  adminDeleteFile,
  getAdminStats,
};
