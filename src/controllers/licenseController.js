const License = require('../models/License');
const Media = require('../models/Media');
const Business = require('../models/Business');

/**
 * Create license request
 * POST /api/licenses
 * Middleware: authenticate, requireVerifiedBusiness, checkDownloadLimit
 * Body: { mediaId, licenseType, terms, price }
 * Increment download count on success
 */
const createLicenseRequest = async (req, res, next) => {
  try {
    const { mediaId, licenseType, terms, price } = req.body;
    const licenseeId = req.business._id;

    // Validate required fields
    if (!mediaId || !licenseType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'mediaId and licenseType are required'
      });
    }

    // Check if media exists and is licensable
    const media = await Media.findById(mediaId);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${mediaId} not found`
      });
    }

    if (!media.isLicensable) {
      return res.status(400).json({
        success: false,
        error: 'Media not licensable',
        message: 'This media is not available for licensing'
      });
    }

    // Check if license type is available for this media
    if (!media.licenseTypes || !media.licenseTypes.includes(licenseType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid license type',
        message: `License type ${licenseType} is not available for this media`
      });
    }

    // Get licensor (media owner)
    const licensorId = media.ownerId;

    // Prevent self-licensing
    if (licensorId.toString() === licenseeId.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Cannot license own media',
        message: 'You cannot create a license request for your own media'
      });
    }

    // Get price for license type
    const priceInfo = media.getPriceForLicenseType(licenseType);
    const licensePrice = price || (priceInfo ? priceInfo.price : 0);
    const currency = priceInfo ? priceInfo.currency : 'USD';

    // Create license request
    const license = await License.create({
      mediaId,
      licensorId,
      licenseeId,
      licenseType,
      terms: terms || {},
      price: licensePrice,
      currency: currency,
      status: 'pending'
    });

    // Increment download count for licensee (Refined Model)
    const licensee = await Business.findById(licenseeId);
    if (licensee) {
      licensee.downloadCount = (licensee.downloadCount || 0) + 1;
      await licensee.save();
    }

    // Populate license details
    await license.populate('mediaId', 'title description url thumbnailUrl');
    await license.populate('licensorId', 'companyName companyType industry');
    await license.populate('licenseeId', 'companyName companyType industry');

    res.status(201).json({
      success: true,
      message: 'License request created successfully',
      data: license
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Get pending licenses (as licensor)
 * GET /api/licenses/pending
 * Middleware: authenticate
 */
const getPendingLicenses = async (req, res, next) => {
  try {
    const licensorId = req.business._id;

    const licenses = await License.find({
      licensorId,
      status: 'pending'
    })
      .populate('mediaId', 'title description url thumbnailUrl')
      .populate('licenseeId', 'companyName companyType industry')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: licenses.length,
      data: licenses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get license requests (as licensee)
 * GET /api/licenses/requests
 * Middleware: authenticate
 */
const getLicenseRequests = async (req, res, next) => {
  try {
    const licenseeId = req.business._id;

    const licenses = await License.find({
      licenseeId,
      status: 'pending'
    })
      .populate('mediaId', 'title description url thumbnailUrl')
      .populate('licensorId', 'companyName companyType industry')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: licenses.length,
      data: licenses
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createLicenseRequest,
  getPendingLicenses,
  getLicenseRequests
};

