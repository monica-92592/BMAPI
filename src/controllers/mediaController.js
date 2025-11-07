const Media = require('../models/Media');
const { generateUniqueFilename } = require('../utils/fileProcessor');
const { 
  uploadImageWithThumbnail, 
  uploadVideo, 
  uploadAudio,
  deleteFromCloudinary 
} = require('../utils/cloudinaryUpload');
const { getFileTypeCategory } = require('../utils/fileValidation');
const sharp = require('sharp');

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
      return res.status(400).json({
        success: false,
        error: 'Invalid file category',
        message: 'File must be image, video, or audio'
      });
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

    const media = await Media.create(mediaData);

    res.status(201).json({
      success: true,
      data: media,
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
    const file = await Media.findById(id);

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
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `File with ID ${id} not found`
      });
    }
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

    // Build query
    const query = {};
    if (type) {
      query.mimetype = type;
    }
    if (category) {
      query.category = category;
    }

    // Get total count
    const total = await Media.countDocuments(query);

    // Get files with pagination
    const files = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: files,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
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
    const file = await Media.findById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `File with ID ${id} not found`
      });
    }

    // Delete from Cloudinary
    try {
      if (file.cloudinaryId) {
        const resourceType = file.category === 'image' ? 'image' : 'video';
        await deleteFromCloudinary(file.cloudinaryId, resourceType);
      }
      
      if (file.thumbnailCloudinaryId) {
        await deleteFromCloudinary(file.thumbnailCloudinaryId, 'image');
      }
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    // Delete from MongoDB
    await Media.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `File with ID ${id} not found`
      });
    }
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

    // Text search in MongoDB
    const query = {
      $or: [
        { originalName: { $regex: q, $options: 'i' } },
        { filename: { $regex: q, $options: 'i' } }
      ]
    };

    const total = await Media.countDocuments(query);

    const files = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: files,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
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
    const totalFiles = await Media.countDocuments();
    const totalSizeResult = await Media.aggregate([
      {
        $group: {
          _id: null,
          totalSize: { $sum: '$size' }
        }
      }
    ]);
    const totalSize = totalSizeResult[0]?.totalSize || 0;

    const byCategory = await Media.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = {
      image: 0,
      video: 0,
      audio: 0
    };

    byCategory.forEach(item => {
      categoryStats[item._id] = item.count;
    });
    
    res.json({
      success: true,
      data: {
        totalFiles,
        totalSize,
        totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
        byCategory: categoryStats
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
