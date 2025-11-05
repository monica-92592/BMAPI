const multer = require('multer');
const path = require('path');
const { validateFile, getFileTypeCategory } = require('../utils/fileValidation');
const { generateUniqueFilename } = require('../utils/fileProcessor');

// Dynamic storage based on file type
const getStorage = () => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const category = getFileTypeCategory(file.mimetype);
        if (!category) {
          return cb(new Error('Invalid file type'));
        }
        
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        const destination = path.join(uploadDir, `${category}s`);
        
        // Store category in request
        req.fileCategory = category;
        
        cb(null, destination);
      } catch (error) {
        cb(error);
      }
    },
    filename: (req, file, cb) => {
      const uniqueFilename = generateUniqueFilename(file.originalname);
      cb(null, uniqueFilename);
    }
  });
};

// File filter
const fileFilter = (req, file, cb) => {
  try {
    validateFile(file);
    cb(null, true);
  } catch (error) {
    cb(new Error(error.message), false);
  }
};

// Create multer instance
const upload = multer({
  storage: getStorage(),
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

