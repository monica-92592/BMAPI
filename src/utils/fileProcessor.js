/**
 * File processing utilities
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const { getFileTypeCategory } = require('./fileValidation');

/**
 * Generate unique filename
 */
const generateUniqueFilename = (originalname) => {
  const ext = path.extname(originalname);
  const basename = path.basename(originalname, ext);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${basename}-${timestamp}-${random}${ext}`;
};

/**
 * Generate thumbnail for image
 */
const generateThumbnail = async (filePath, outputPath, width = 200, height = 200) => {
  try {
    await sharp(filePath)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    
    return true;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return false;
  }
};

/**
 * Get image metadata
 */
const getImageMetadata = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: metadata.size
    };
  } catch (error) {
    console.error('Error getting image metadata:', error);
    return null;
  }
};

/**
 * Process image (resize, convert format, optimize)
 */
const processImage = async (filePath, options = {}) => {
  try {
    let pipeline = sharp(filePath);

    // Resize if dimensions provided
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: options.fit || 'inside',
        withoutEnlargement: options.withoutEnlargement !== false
      });
    }

    // Convert format if specified
    if (options.format) {
      switch (options.format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({ quality: options.quality || 80 });
          break;
        case 'png':
          pipeline = pipeline.png({ quality: options.quality || 80 });
          break;
        case 'webp':
          pipeline = pipeline.webp({ quality: options.quality || 80 });
          break;
        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }
    }

    // Optimize if requested
    if (options.optimize) {
      pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
    }

    return pipeline;
  } catch (error) {
    throw new Error(`Image processing error: ${error.message}`);
  }
};

/**
 * Get file stats
 */
const getFileStats = async (filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateUniqueFilename,
  generateThumbnail,
  getImageMetadata,
  processImage,
  getFileStats
};

