const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure upload directory exists with restricted permissions
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Engine Config - sanitize filenames
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use crypto random bytes + timestamp for secure, non-guessable filenames
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${randomName}${ext}`);
  }
});

// Allowed MIME types for spreadsheet files
const allowedMimeTypes = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/csv',
  'text/x-csv',
  'application/x-csv'
];

const allowedExtensions = ['.csv', '.xlsx', '.xls'];

// File validation filter - check both extension AND MIME type
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    const error = new Error('Invalid file type. Only CSV and Excel sheets (.csv, .xlsx, .xls) are supported!');
    error.statusCode = 400;
    return cb(error, false);
  }

  if (!allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error('Invalid file content. The uploaded file does not appear to be a valid spreadsheet.');
    error.statusCode = 400;
    return cb(error, false);
  }
  
  cb(null, true);
};

// Multer error handler wrapper
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit size to 10MB per file
    files: 2 // Max 2 files per upload (bank + internal)
  }
});

// Wrapper to catch multer errors and pass to express error handler
const handleUpload = (multerMiddleware) => {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (err) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 10MB.'
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files uploaded. Maximum is 2 files (bank statement + internal records).'
          });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: 'Unexpected file field name.'
          });
        }
        // Pass other errors (like file filter errors) to the error handler
        return next(err);
      }
      next();
    });
  };
};

module.exports = { upload, handleUpload };
