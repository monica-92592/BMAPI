const path = require('path');
const fs = require('fs').promises;
const fileRegistry = require('../utils/fileRegistry');
const { validateFile, getFileTypeCategory } = require('../utils/fileValidation');
const { generateThumbnail, getImageMetadata, getFileStats } = require('../utils/fileProcessor');

/**
 * Upload file
 */
const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please provide a file to upload'
      });
    }

    const file = req.file;
    const category = req.fileCategory || getFileTypeCategory(file.mimetype);
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = path.join(uploadDir, `${category}s`, file.filename);
    const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

    // Get file stats
    const stats = await getFileStats(filePath);
    
    // Additional metadata for images
    let imageMetadata = null;
    if (category === 'image') {
      imageMetadata = await getImageMetadata(filePath);
      
      // Generate thumbnail automatically
      const thumbnailPath = path.join(uploadDir, 'thumbnails', file.filename);
      await generateThumbnail(filePath, thumbnailPath);
    }

    // Create file record
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

    res.status(201).json({
      success: true,
      data: record,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single file by ID
 */
const getFileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = fileRegistry.getById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `File with ID ${id} not found`
      });
    }

    res.json({
      success: true,
      data: file
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all files with pagination and filtering
 */
const listFiles = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const type = req.query.type || null;
    const category = req.query.category || null;

    const result = fileRegistry.list({
      limit,
      offset,
      type,
      category
    });

    res.json({
      success: true,
      data: result.files,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete file
 */
const deleteFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = fileRegistry.getById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `File with ID ${id} not found`
      });
    }

    // Delete file from storage
    try {
      await fs.unlink(file.path);
      
      // Delete thumbnail if exists
      if (file.thumbnailUrl) {
        const uploadDir = process.env.UPLOAD_DIR || './uploads';
        const thumbnailPath = path.join(uploadDir, 'thumbnails', file.filename);
        await fs.unlink(thumbnailPath).catch(() => {
          // Ignore if thumbnail doesn't exist
        });
      }
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Continue with registry deletion even if file deletion fails
    }

    // Delete from registry
    fileRegistry.delete(id);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search files by name
 */
const searchFiles = async (req, res, next) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Missing search query',
        message: 'Please provide a search query parameter (q)'
      });
    }

    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const result = fileRegistry.search(q, { limit, offset });

    res.json({
      success: true,
      data: result.files,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get file statistics
 */
const getStats = async (req, res, next) => {
  try {
    const stats = fileRegistry.getStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        totalSizeMB: (stats.totalSize / (1024 * 1024)).toFixed(2)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadFile,
  getFileById,
  listFiles,
  deleteFile,
  searchFiles,
  getStats
};

