const Media = require('../models/Media');
const { uploadImageWithThumbnail } = require('../utils/cloudinaryUpload');
const sharp = require('sharp');
const axios = require('axios');

/**
 * Process image (resize, convert format, optimize)
 */
const processImageById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { width, height, format, quality, fit, optimize } = req.body;

    // Get file from MongoDB
    const file = await Media.findById(id);

    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `File with ID ${id} not found`
      });
    }

    // Check if file is an image
    if (file.category !== 'image') {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: 'File must be an image to process'
      });
    }

    // Process image options
    const options = {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      format: format || undefined,
      quality: quality ? parseInt(quality) : 80,
      fit: fit || 'inside',
      optimize: optimize === true || optimize === 'true'
    };

    // Fetch image from Cloudinary URL and process
    const response = await axios.get(file.url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    
    // Process with Sharp
    let pipeline = sharp(buffer);
    
    if (options.width || options.height) {
      pipeline = pipeline.resize(options.width, options.height, {
        fit: options.fit || 'inside',
        withoutEnlargement: true
      });
    }

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
      }
    }

    const processedBuffer = await pipeline.toBuffer();
    const metadata = await sharp(processedBuffer).metadata();

    // Generate unique filename for processed image
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = format ? `.${format}` : '.jpg';
    const processedFilename = `processed-${timestamp}-${random}${ext}`;

    // Upload processed image to Cloudinary
    const uploadResult = await uploadImageWithThumbnail(processedBuffer, processedFilename);

    // Create new file record in MongoDB
    const processedFileData = {
      filename: processedFilename,
      originalName: file.originalName,
      mimetype: format ? `image/${format}` : file.mimetype,
      category: 'image',
      size: processedBuffer.length,
      url: uploadResult.url,
      cloudinaryId: uploadResult.cloudinaryId,
      thumbnailUrl: uploadResult.thumbnailUrl,
      thumbnailCloudinaryId: uploadResult.thumbnailCloudinaryId,
      metadata: {
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format
      },
      ownerId: req.business?._id || req.user?._id || file.ownerId
    };

    const record = await Media.create(processedFileData);

    res.json({
      success: true,
      data: record,
      message: 'Image processed successfully'
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

module.exports = {
  processImage: processImageById
};
