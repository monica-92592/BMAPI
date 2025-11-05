const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const {
  uploadFile,
  getFileById,
  listFiles,
  deleteFile,
  searchFiles,
  getStats
} = require('../controllers/mediaController');
const { processImage } = require('../controllers/imageController');
const { serveFile } = require('../controllers/fileController');

// Upload endpoints
router.post('/upload', upload.single('file'), uploadFile);

// Bulk upload endpoint
router.post('/upload/bulk', upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
        message: 'Please provide files to upload'
      });
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const fileRegistry = require('../utils/fileRegistry');
    const { getFileTypeCategory } = require('../utils/fileValidation');
    const { generateThumbnail, getImageMetadata, getFileStats } = require('../utils/fileProcessor');
    const path = require('path');

    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        const category = getFileTypeCategory(file.mimetype);
        const filePath = path.join(uploadDir, `${category}s`, file.filename);

        const stats = await getFileStats(filePath);
        
        let imageMetadata = null;
        if (category === 'image') {
          imageMetadata = await getImageMetadata(filePath);
          const thumbnailPath = path.join(uploadDir, 'thumbnails', file.filename);
          await generateThumbnail(filePath, thumbnailPath);
        }

        const fileData = {
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          category: category,
          size: file.size,
          path: filePath,
          url: `${apiBaseUrl}/api/media/file/${file.filename}`,
          downloadUrl: `${apiBaseUrl}/api/media/file/${file.filename}`,
          thumbnailUrl: category === 'image' ? `${apiBaseUrl}/api/media/file/thumbnails/${file.filename}` : null,
          metadata: imageMetadata || null
        };

        const record = fileRegistry.create(fileData);
        uploadedFiles.push(record);
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        uploadedFiles.push({
          error: error.message,
          filename: file.originalname
        });
      }
    }

    res.status(201).json({
      success: true,
      data: uploadedFiles,
      message: `${uploadedFiles.length} file(s) uploaded`
    });
  } catch (error) {
    next(error);
  }
});

// Serve files (must come before /:id route)
router.get('/file/thumbnails/:filename', serveFile);
router.get('/file/:filename', serveFile);

// Image processing
router.post('/process/:id', processImage);

// Search files (must come before /:id route)
router.get('/search', searchFiles);

// Get statistics (must come before /:id route)
router.get('/stats', getStats);

// List all files (must come before /:id route)
router.get('/', listFiles);

// Get file by ID (must come last to avoid conflicts)
router.get('/:id', getFileById);

// Delete file
router.delete('/:id', deleteFile);

module.exports = router;

