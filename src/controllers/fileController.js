const Media = require('../models/Media');

/**
 * Serve file by filename - redirects to Cloudinary URL
 */
const serveFile = async (req, res, next) => {
  try {
    const { filename } = req.params;
    
    // Check if it's a thumbnail request
    const isThumbnail = req.path.includes('/thumbnails/');
    
    // Find file in MongoDB
    const file = await Media.findOne({ filename: filename });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: `File ${filename} not found`
      });
    }

    // Redirect to Cloudinary URL
    const url = isThumbnail ? file.thumbnailUrl : file.url;
    
    if (!url) {
      return res.status(404).json({
        success: false,
        error: 'File URL not found',
        message: `File URL for ${filename} not found`
      });
    }

    // Redirect to Cloudinary URL
    res.redirect(url);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  serveFile
};
