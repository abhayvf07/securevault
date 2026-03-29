const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const ActivityLog = require('../models/ActivityLog');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const logger = require('../utils/logger');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

/**
 * Auth Controller
 * Handles user registration, login, token refresh, and logout.
 * Uses short-lived access tokens (15min) + long-lived refresh tokens (7d).
 */

// ─── Helper: Save refresh token to DB and set httpOnly cookie ───
const issueRefreshToken = async (userId, res) => {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await RefreshToken.create({
    userId,
    token: refreshToken,
    expiresAt,
  });

  // Set as httpOnly cookie (secure in production)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/auth', // Only sent to auth endpoints
  });

  return refreshToken;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  // Create user (password hashed automatically via pre-save hook)
  const user = await User.create({ name, email, password });

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  await issueRefreshToken(user._id, res);

  // Log activity
  await ActivityLog.create({
    userId: user._id,
    action: 'REGISTER',
    resourceType: 'user',
    resourceId: user._id,
    resourceName: user.email,
    ipAddress: req.ip,
  });

  logger.success(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token: accessToken,
    },
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user and explicitly include password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Verify password
  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate tokens
  const accessToken = generateAccessToken(user._id);
  await issueRefreshToken(user._id, res);

  // Log activity
  await ActivityLog.create({
    userId: user._id,
    action: 'LOGIN',
    resourceType: 'user',
    resourceId: user._id,
    resourceName: user.email,
    ipAddress: req.ip,
  });

  logger.success(`User logged in: ${user.email}`);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token: accessToken,
    },
  });
});

// @desc    Refresh access token using refresh token cookie
// @route   POST /api/auth/refresh
// @access  Public (uses httpOnly cookie)
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new AppError('No refresh token provided', 401);
  }

  // Find the refresh token in DB
  const storedToken = await RefreshToken.findOne({ token: refreshToken });

  if (!storedToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Check if expired (belt-and-suspenders — TTL index handles cleanup)
  if (storedToken.expiresAt < new Date()) {
    await RefreshToken.findByIdAndDelete(storedToken._id);
    throw new AppError('Refresh token expired', 401);
  }

  // Token rotation: delete old token, issue new pair
  await RefreshToken.findByIdAndDelete(storedToken._id);

  // Issue new tokens
  const newAccessToken = generateAccessToken(storedToken.userId);
  await issueRefreshToken(storedToken.userId, res);

  res.status(200).json({
    success: true,
    message: 'Token refreshed',
    data: {
      token: newAccessToken,
    },
  });
});

// @desc    Logout user (invalidate refresh token)
// @route   POST /api/auth/logout
// @access  Public
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (refreshToken) {
    // Delete refresh token from DB
    await RefreshToken.findOneAndDelete({ token: refreshToken });
  }

  // Clear the cookie
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
    },
  });
});

module.exports = { register, login, refreshAccessToken, logout, getMe };
