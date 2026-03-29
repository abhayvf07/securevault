const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * File Upload Middleware (Multer Configuration)
 *
 * - Stores files on disk in /uploads directory
 * - Generates unique filenames using UUID to prevent collisions
 * - Validates file types (blocks dangerous extensions)
 * - Enforces 5MB file size limit
 */

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/json',
  'application/zip',
  'application/x-rar-compressed',
];

// Blocked file extensions (security: prevent executable uploads)
const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.sh', '.msi', '.com', '.scr',
  '.pif', '.vbs', '.js', '.wsf', '.ps1', '.dll',
];

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename: uuid + original extension
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter: validate type and extension
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Check blocked extensions
  if (BLOCKED_EXTENSIONS.includes(ext)) {
    return cb(
      new Error(`File type "${ext}" is not allowed for security reasons`),
      false
    );
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(
      new Error(`File type "${file.mimetype}" is not supported. Allowed: images, PDFs, documents, text files`),
      false
    );
  }

  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 20 * 1024 * 1024, // 20MB
  },
});

/**
 * Middleware wrapper to handle Multer errors with standardized responses.
 */
const uploadMiddleware = (req, res, next) => {
  const singleUpload = upload.single('file');

  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 20MB',
        });
      }
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`,
      });
    }

    if (err) {
      // Custom filter errors
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    // No file provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided. Please select a file to upload',
      });
    }

    next();
  });
};

module.exports = uploadMiddleware;
