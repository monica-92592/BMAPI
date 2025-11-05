const path = require('path');
const fs = require('fs');
const fileRegistry = require('../utils/fileRegistry');

/**
 * Serve file by filename
 */
const serveFile = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // Check if it's a thumbnail request
    const isThumbnail = req.path.includes('/thumbnails/');
    
    let filePath;
    if (isThumbnail) {
      filePath = path.join(uploadDir, 'thumbnails', filename);
    } else {
      // Try to find file in registry
      const file = fileRegistry.getByFilename(filename);
      
      if (file) {
        filePath = file.path;
      } else {
        // Try to find in all categories
        const categories = ['images', 'videos', 'audio'];
        for (const category of categories) {
          const potentialPath = path.join(uploadDir, category, filename);
          if (fs.existsSync(potentialPath)) {
            filePath = potentialPath;
            break;
          }
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `File ${filename} not found`
      });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const range = req.headers.range;

    // Get MIME type from registry or infer from extension
    let mimetype = 'application/octet-stream';
    const file = fileRegistry.getByFilename(filename);
    if (file) {
      mimetype = file.mimetype;
    } else {
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav'
      };
      mimetype = mimeTypes[ext] || mimetype;
    }

    // Set headers
    res.setHeader('Content-Type', mimetype);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Accept-Ranges', 'bytes');

    // Handle range requests for video/audio streaming
    if (range && (mimetype.startsWith('video/') || mimetype.startsWith('audio/'))) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.status(206); // Partial Content
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunksize);
      
      file.pipe(res);
    } else {
      // For images or full file downloads
      const file = fs.createReadStream(filePath);
      file.pipe(res);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  serveFile
};

