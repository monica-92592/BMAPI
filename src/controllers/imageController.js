const path = require('path');
const fs = require('fs').promises;
const fileRegistry = require('../utils/fileRegistry');
const { processImage, generateThumbnail, getImageMetadata } = require('../utils/fileProcessor');

/**
 * Process image (resize, convert format, optimize)
 */
const processImageById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { width, height, format, quality, fit, optimize } = req.body;

    // Get file from registry
    const file = fileRegistry.getById(id);

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

    // Check if file exists
    try {
      await fs.access(file.path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: 'File does not exist on disk'
      });
    }

    // Process image
    const options = {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      format: format || undefined,
      quality: quality ? parseInt(quality) : 80,
      fit: fit || 'inside',
      optimize: optimize === true || optimize === 'true'
    };

    const pipeline = await processImage(file.path, options);

    // Generate output filename
    const ext = format ? `.${format}` : path.extname(file.filename);
    const basename = path.basename(file.filename, path.extname(file.filename));
    const outputFilename = `${basename}-processed${ext}`;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const outputPath = path.join(uploadDir, 'images', outputFilename);

    // Save processed image
    await pipeline.toFile(outputPath);

    // Get new metadata
    const metadata = await getImageMetadata(outputPath);
    const stats = await fs.stat(outputPath);

    // Create new file record
    const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    
    const processedFileData = {
      filename: outputFilename,
      originalName: file.originalName,
      mimetype: format ? `image/${format}` : file.mimetype,
      category: 'image',
      size: stats.size,
      path: outputPath,
      url: `${apiBaseUrl}/api/media/file/${outputFilename}`,
      downloadUrl: `${apiBaseUrl}/api/media/file/${outputFilename}`,
      thumbnailUrl: `${apiBaseUrl}/api/media/file/thumbnails/${outputFilename}`,
      metadata: metadata,
      processedFrom: id,
      processingOptions: options
    };

    const record = fileRegistry.create(processedFileData);

    // Generate thumbnail for processed image
    const thumbnailPath = path.join(uploadDir, 'thumbnails', outputFilename);
    await generateThumbnail(outputPath, thumbnailPath);

    res.json({
      success: true,
      data: record,
      message: 'Image processed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processImage: processImageById
};

