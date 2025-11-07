const cloudinary = require('../config/cloudinary');
const sharp = require('sharp');
const { Readable } = require('stream');

/**
 * Upload file to Cloudinary
 */
const uploadToCloudinary = async (fileBuffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'media',
        resource_type: options.resourceType || 'auto',
        ...options
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Convert buffer to stream
    const bufferStream = new Readable();
    bufferStream.push(fileBuffer);
    bufferStream.push(null);
    
    bufferStream.pipe(uploadStream);
  });
};

/**
 * Upload image and generate thumbnail
 */
const uploadImageWithThumbnail = async (fileBuffer, filename) => {
  try {
    // Upload original image
    const originalResult = await uploadToCloudinary(fileBuffer, {
      folder: 'media/images',
      public_id: filename.replace(/\.[^/.]+$/, ''), // Remove extension
      resource_type: 'image'
    });

    // Generate thumbnail buffer
    const thumbnailBuffer = await sharp(fileBuffer)
      .resize(200, 200, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Upload thumbnail
    const thumbnailResult = await uploadToCloudinary(thumbnailBuffer, {
      folder: 'media/thumbnails',
      public_id: filename.replace(/\.[^/.]+$/, ''),
      resource_type: 'image'
    });

    return {
      url: originalResult.secure_url,
      cloudinaryId: originalResult.public_id,
      thumbnailUrl: thumbnailResult.secure_url,
      thumbnailCloudinaryId: thumbnailResult.public_id,
      width: originalResult.width,
      height: originalResult.height,
      format: originalResult.format
    };
  } catch (error) {
    throw new Error(`Cloudinary upload error: ${error.message}`);
  }
};

/**
 * Upload video to Cloudinary
 */
const uploadVideo = async (fileBuffer, filename) => {
  try {
    const result = await uploadToCloudinary(fileBuffer, {
      folder: 'media/videos',
      public_id: filename.replace(/\.[^/.]+$/, ''),
      resource_type: 'video'
    });

    return {
      url: result.secure_url,
      cloudinaryId: result.public_id
    };
  } catch (error) {
    throw new Error(`Cloudinary upload error: ${error.message}`);
  }
};

/**
 * Upload audio to Cloudinary
 */
const uploadAudio = async (fileBuffer, filename) => {
  try {
    const result = await uploadToCloudinary(fileBuffer, {
      folder: 'media/audio',
      public_id: filename.replace(/\.[^/.]+$/, ''),
      resource_type: 'video' // Cloudinary uses 'video' for audio too
    });

    return {
      url: result.secure_url,
      cloudinaryId: result.public_id
    };
  } catch (error) {
    throw new Error(`Cloudinary upload error: ${error.message}`);
  }
};

/**
 * Delete file from Cloudinary
 */
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  uploadImageWithThumbnail,
  uploadVideo,
  uploadAudio,
  deleteFromCloudinary
};

