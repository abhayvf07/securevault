const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication Middleware
 *
 * Strategy: localStorage + Authorization header (Option A)
 *
 * WHY localStorage over httpOnly cookies:
 * - Simpler implementation for learning/portfolio projects
 * - Works easily with React SPA + Axios interceptors
 * - No CSRF concerns (cookies are vulnerable to CSRF)
 * - Trade-off: vulnerable to XSS (mitigated by Helmet CSP headers)
 *
 * For production apps, httpOnly cookies + refresh tokens (Option B) is more secure,
 * but adds complexity with CSRF tokens and cookie configuration.
 *
 * The token is sent in the Authorization header as: Bearer <token>
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no token provided',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request (exclude password)
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user no longer exists',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — token expired',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized',
    });
  }
};

module.exports = { protect };
