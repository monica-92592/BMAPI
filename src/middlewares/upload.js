const multer = require('multer');
const { validateFile, getFileTypeCategory } = require('../utils/fileValidation');
const { generateUniqueFilename } = require('../utils/fileProcessor');

// Use memory storage for Cloudinary (files will be in memory as buffers)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
  try {
    validateFile(file);
    const category = getFileTypeCategory(file.mimetype);
    if (!category) {
      return cb(new Error('Invalid file type'));
    }
    
    // Store category in request
    req.fileCategory = category;
    
    cb(null, true);
  } catch (error) {
    cb(new Error(error.message), false);
  }
};

// Create multer instance
const upload = multer({
  storage: storage, // Memory storage for Cloudinary
  fileFilter: fileFilter,
  limits: {
    fileSize: Math.max(
      parseInt(process.env.MAX_FILE_SIZE_IMAGE) || 10 * 1024 * 1024,
      parseInt(process.env.MAX_FILE_SIZE_VIDEO) || 100 * 1024 * 1024,
      parseInt(process.env.MAX_FILE_SIZE_AUDIO) || 20 * 1024 * 1024
    )
  }
});

module.exports = upload;

