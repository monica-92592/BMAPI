const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { checkUploadLimit } = require('../middlewares/auth');
const {
  uploadFile,
  getFileById,
  listFiles,
  deleteFile,
  searchFiles,
  getStats,
  updateMediaLicensing,
  setMediaPricing,
  setMediaLicenseTypes,
  setMediaUsageRestrictions,
  makeMediaLicensable,
  addMediaToPool,
  removeMediaFromPool,
  listLicensableMedia,
  getMediaLicensingInfo
} = require('../controllers/mediaController');
const { processImage } = require('../controllers/imageController');
const { serveFile } = require('../controllers/fileController');

// Upload endpoints (protected - already authenticated via app.js)
// Apply upload limit check (Refined Model)
router.post('/upload', checkUploadLimit, upload.single('file'), uploadFile);

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

    const Media = require('../models/Media');
    const { generateUniqueFilename } = require('../utils/fileProcessor');
    const { getFileTypeCategory } = require('../utils/fileValidation');
    const { 
      uploadImageWithThumbnail, 
      uploadVideo, 
      uploadAudio 
    } = require('../utils/cloudinaryUpload');

    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        const category = getFileTypeCategory(file.mimetype);
        const uniqueFilename = generateUniqueFilename(file.originalname);
        
        let uploadResult;
        let imageMetadata = null;

        // Upload to Cloudinary based on category
        if (category === 'image') {
          uploadResult = await uploadImageWithThumbnail(file.buffer, uniqueFilename);
          imageMetadata = {
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format
          };
        } else if (category === 'video') {
          uploadResult = await uploadVideo(file.buffer, uniqueFilename);
        } else if (category === 'audio') {
          uploadResult = await uploadAudio(file.buffer, uniqueFilename);
        } else {
          uploadedFiles.push({
            error: 'Invalid file category',
            filename: file.originalname
          });
          continue;
        }

        // Create file record in MongoDB
        const mediaData = {
          filename: uniqueFilename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          category: category,
          size: file.size,
          url: uploadResult.url,
          cloudinaryId: uploadResult.cloudinaryId,
          thumbnailUrl: uploadResult.thumbnailUrl || null,
          thumbnailCloudinaryId: uploadResult.thumbnailCloudinaryId || null,
          metadata: imageMetadata || null,
          ownerId: req.business?._id || req.user?._id || null
        };

        const record = await Media.create(mediaData);
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

// List licensable media (must come before /:id route)
router.get('/licensable', listLicensableMedia);

// List all files (must come before /:id route)
router.get('/', listFiles);

// Licensing routes (must come before /:id route to avoid conflicts)
router.put('/:id/licensing', updateMediaLicensing);
router.put('/:id/pricing', setMediaPricing);
router.put('/:id/license-types', setMediaLicenseTypes);
router.put('/:id/usage-restrictions', setMediaUsageRestrictions);
router.put('/:id/make-licensable', makeMediaLicensable);
router.put('/:id/pool', addMediaToPool);
router.delete('/:id/pool', removeMediaFromPool);
router.get('/:id/licensing-info', getMediaLicensingInfo);

// Get file by ID (must come last to avoid conflicts)
router.get('/:id', getFileById);

// Delete file
router.delete('/:id', deleteFile);

module.exports = router;

