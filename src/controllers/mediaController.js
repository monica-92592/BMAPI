const Media = require('../models/Media');
const Business = require('../models/Business');
const { generateUniqueFilename } = require('../utils/fileProcessor');
const { 
  uploadImageWithThumbnail, 
  uploadVideo, 
  uploadAudio,
  deleteFromCloudinary 
} = require('../utils/cloudinaryUpload');
const { getFileTypeCategory } = require('../utils/fileValidation');
const { checkUploadLimit } = require('../utils/businessUtils');
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

    // Validate upload limit (Refined Model)
    const business = req.business || req.user;
    if (business) {
      const canUpload = await business.canUpload();
      if (!canUpload) {
        const uploadLimit = business.membershipTier === 'free' ? 25 : null;
        return res.status(403).json({
          success: false,
          error: 'Upload limit reached',
          message: 'Upload limit reached. Upgrade to Contributor for unlimited uploads.',
          currentUploads: business.uploadCount || 0,
          uploadLimit: uploadLimit,
          upgradeUrl: '/api/subscriptions/upgrade',
          upgradeMessage: 'Upgrade to Contributor for unlimited uploads'
        });
      }
    }

    const file = req.file;

    // Validate file type
    const category = req.fileCategory || getFileTypeCategory(file.mimetype);
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: `File type ${file.mimetype} is not supported. Allowed types: images, videos, audio`,
        allowedTypes: ['image', 'video', 'audio']
      });
    }

    // Validate file size
    const { FILE_SIZE_LIMITS } = require('../utils/fileValidation');
    const maxSize = FILE_SIZE_LIMITS[category];
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      return res.status(400).json({
        success: false,
        error: 'File size exceeds limit',
        message: `File size exceeds maximum allowed size of ${maxSizeMB}MB for ${category} files`,
        fileSize: file.size,
        maxSize: maxSize,
        category: category
      });
    }
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

    // Create file record in MongoDB with default licensing fields
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
      ownerId: req.business?._id || req.user?._id || null,
      // Default licensing fields
      isLicensable: false,
      ownershipModel: 'individual',
      licenseCount: 0,
      activeLicenses: []
    };

    const media = await Media.create(mediaData);

    res.status(201).json({
      success: true,
      data: media,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    // Handle upload limit error from pre-save hook
    if (error.message && error.message.includes('Upload limit reached')) {
      return res.status(403).json({
        success: false,
        error: 'Upload limit reached',
        message: error.message,
        upgradeUrl: '/api/subscriptions/upgrade',
        upgradeMessage: 'Upgrade to Contributor for unlimited uploads'
      });
    }
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

/**
 * Update media licensing information
 */
const updateMediaLicensing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, tags, copyrightInformation } = req.body;

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }

    // Check ownership
    const business = req.business || req.user;
    if (media.ownerId.toString() !== business._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to update this media'
      });
    }

    // Update licensing fields
    if (title !== undefined) media.title = title;
    if (description !== undefined) media.description = description;
    if (tags !== undefined) media.tags = tags;
    if (copyrightInformation !== undefined) media.copyrightInformation = copyrightInformation;

    await media.save();

    res.json({
      success: true,
      data: media,
      message: 'Media licensing information updated successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }
    next(error);
  }
};

/**
 * Set media pricing
 */
const setMediaPricing = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { basePrice, currency, licenseType } = req.body;

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }

    // Check ownership
    const business = req.business || req.user;
    if (media.ownerId.toString() !== business._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to update this media'
      });
    }

    // Update pricing
    if (!media.pricing) {
      media.pricing = {};
    }
    if (basePrice !== undefined) media.pricing.basePrice = basePrice;
    if (currency !== undefined) media.pricing.currency = currency;
    if (licenseType !== undefined) media.pricing.licenseType = licenseType;

    await media.save();

    res.json({
      success: true,
      data: media,
      message: 'Media pricing updated successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }
    next(error);
  }
};

/**
 * Set available license types
 */
const setMediaLicenseTypes = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { licenseTypes } = req.body;

    if (!licenseTypes || !Array.isArray(licenseTypes)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'licenseTypes must be an array'
      });
    }

    // Validate license types
    const validTypes = ['commercial', 'editorial', 'exclusive'];
    const invalidTypes = licenseTypes.filter(type => !validTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: `Invalid license types: ${invalidTypes.join(', ')}. Valid types are: ${validTypes.join(', ')}`
      });
    }

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }

    // Check ownership
    const business = req.business || req.user;
    if (media.ownerId.toString() !== business._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to update this media'
      });
    }

    // Update license types
    media.licenseTypes = licenseTypes;

    await media.save();

    res.json({
      success: true,
      data: media,
      message: 'Media license types updated successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }
    next(error);
  }
};

/**
 * Set usage restrictions
 */
const setMediaUsageRestrictions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { geographic, duration, modification } = req.body;

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }

    // Check ownership
    const business = req.business || req.user;
    if (media.ownerId.toString() !== business._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to update this media'
      });
    }

    // Update usage restrictions
    if (!media.usageRestrictions) {
      media.usageRestrictions = {};
    }
    if (geographic !== undefined) media.usageRestrictions.geographic = geographic;
    if (duration !== undefined) media.usageRestrictions.duration = duration;
    if (modification !== undefined) media.usageRestrictions.modification = modification;

    await media.save();

    res.json({
      success: true,
      data: media,
      message: 'Media usage restrictions updated successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }
    next(error);
  }
};

/**
 * Enable licensing for media
 */
const makeMediaLicensable = async (req, res, next) => {
  try {
    const { id } = req.params;

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }

    // Check ownership
    const business = req.business || req.user;
    if (media.ownerId.toString() !== business._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to update this media'
      });
    }

    // Enable licensing
    media.isLicensable = true;

    await media.save();

    res.json({
      success: true,
      data: media,
      message: 'Media is now licensable'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }
    next(error);
  }
};

/**
 * Add media to collection/pool
 */
const addMediaToPool = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { poolId } = req.body;

    if (!poolId) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'poolId is required'
      });
    }

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }

    // Check ownership
    const business = req.business || req.user;
    if (media.ownerId.toString() !== business._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to update this media'
      });
    }

    // Add to pool
    media.poolId = poolId;
    media.ownershipModel = 'pooled';

    await media.save();

    res.json({
      success: true,
      data: media,
      message: 'Media added to pool successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }
    next(error);
  }
};

/**
 * Remove media from pool
 */
const removeMediaFromPool = async (req, res, next) => {
  try {
    const { id } = req.params;

    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }

    // Check ownership
    const business = req.business || req.user;
    if (media.ownerId.toString() !== business._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to update this media'
      });
    }

    // Remove from pool
    media.poolId = null;
    media.ownershipModel = 'individual';

    await media.save();

    res.json({
      success: true,
      data: media,
      message: 'Media removed from pool successfully'
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }
    next(error);
  }
};

/**
 * List licensable media
 */
const listLicensableMedia = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category || null;
    const licenseType = req.query.licenseType || null;
    const priceRange = req.query.priceRange || null;

    // Build query for licensable media
    const query = { isLicensable: true };

    if (category) {
      query.category = category;
    }

    if (licenseType) {
      query.licenseTypes = { $in: [licenseType] };
    }

    if (priceRange) {
      const [min, max] = priceRange.split('-').map(Number);
      if (!isNaN(min) && !isNaN(max)) {
        query['pricing.basePrice'] = { $gte: min, $lte: max };
      } else if (!isNaN(min)) {
        query['pricing.basePrice'] = { $gte: min };
      } else if (!isNaN(max)) {
        query['pricing.basePrice'] = { $lte: max };
      }
    }

    // Get total count
    const total = await Media.countDocuments(query);

    // Get files with pagination
    const files = await Media.find(query)
      .populate('ownerId', 'companyName companyType industry')
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
 * Get licensing details for media
 */
const getMediaLicensingInfo = async (req, res, next) => {
  try {
    const { id } = req.params;

    let media = await Media.findById(id)
      .populate('ownerId', 'companyName companyType industry membershipTier')
      .lean();

    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }

    // Try to populate activeLicenses if License model exists
    let activeLicenses = media.activeLicenses || [];
    if (activeLicenses.length > 0) {
      try {
        const License = require('../models/License');
        const populatedLicenses = await License.find({ _id: { $in: activeLicenses } }).lean();
        if (populatedLicenses && populatedLicenses.length > 0) {
          activeLicenses = populatedLicenses;
        }
      } catch (error) {
        // License model doesn't exist yet, keep activeLicenses as IDs
      }
    }

    // Return licensing information
    const licensingInfo = {
      id: media._id,
      title: media.title,
      description: media.description,
      tags: media.tags,
      isLicensable: media.isLicensable,
      ownershipModel: media.ownershipModel,
      licenseTypes: media.licenseTypes,
      pricing: media.pricing,
      usageRestrictions: media.usageRestrictions,
      copyrightInformation: media.copyrightInformation,
      licenseCount: media.licenseCount,
      activeLicenses: activeLicenses,
      watermarkedPreviewUrl: media.watermarkedPreviewUrl,
      poolId: media.poolId,
      owner: media.ownerId
    };

    res.json({
      success: true,
      data: licensingInfo
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }
    next(error);
  }
};

module.exports = {
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
};
