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

    // Validate license type
    const validLicenseTypes = ['commercial', 'editorial', 'exclusive'];
    if (!validLicenseTypes.includes(licenseType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid license type',
        message: `License type must be one of: ${validLicenseTypes.join(', ')}`,
        validTypes: validLicenseTypes
      });
    }

    // Check if license type is available for this media
    if (!media.licenseTypes || !media.licenseTypes.includes(licenseType)) {
      return res.status(400).json({
        success: false,
        error: 'License type not available',
        message: `License type ${licenseType} is not available for this media`,
        availableTypes: media.licenseTypes || []
      });
    }

    // Validate terms
    if (terms) {
      if (typeof terms !== 'object' || Array.isArray(terms)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid terms',
          message: 'Terms must be an object'
        });
      }

      // Validate duration if provided
      if (terms.duration && typeof terms.duration !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Invalid terms',
          message: 'Terms duration must be a string (e.g., "1 year", "6 months")'
        });
      }

      // Validate geographic restrictions if provided
      if (terms.geographic && !Array.isArray(terms.geographic)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid terms',
          message: 'Terms geographic must be an array of strings'
        });
      }

      // Validate modification flag if provided
      if (terms.modification !== undefined && typeof terms.modification !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Invalid terms',
          message: 'Terms modification must be a boolean'
        });
      }
    }

    // Validate price
    if (price !== undefined) {
      if (typeof price !== 'number' || price < 0 || isNaN(price)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid price',
          message: 'Price must be a non-negative number'
        });
      }
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
    const licensePrice = price !== undefined ? price : (priceInfo ? priceInfo.price : 0);
    const currency = priceInfo ? priceInfo.currency : 'USD';

    // Validate final price
    if (licensePrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price',
        message: 'License price must be non-negative'
      });
    }

    // Check download limit (additional validation in controller)
    const licensee = await Business.findById(licenseeId);
    if (licensee) {
      const canDownload = licensee.canDownload();
      if (!canDownload) {
        return res.status(403).json({
          success: false,
          error: 'Download limit reached',
          message: 'Download limit reached (50/month). Upgrade to Contributor for unlimited downloads.',
          currentDownloads: licensee.downloadCount || 0,
          downloadLimit: 50,
          upgradeUrl: '/api/subscriptions/upgrade'
        });
      }
    }

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
    // Reuse licensee variable from above
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

/**
 * List all licenses
 * GET /api/licenses
 * Middleware: authenticate
 * Query params: status, type, asLicensor, asLicensee
 */
const listLicenses = async (req, res, next) => {
  try {
    const { status, type, asLicensor, asLicensee } = req.query;
    const businessId = req.business._id;

    // Build query
    const query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by license type
    if (type) {
      query.licenseType = type;
    }

    // Filter by role
    if (asLicensor === 'true') {
      query.licensorId = businessId;
    } else if (asLicensee === 'true') {
      query.licenseeId = businessId;
    } else {
      // Default: show licenses where business is either licensor or licensee
      query.$or = [
        { licensorId: businessId },
        { licenseeId: businessId }
      ];
    }

    const licenses = await License.find(query)
      .populate('mediaId', 'title description url thumbnailUrl')
      .populate('licensorId', 'companyName companyType industry')
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
 * Get license details
 * GET /api/licenses/:id
 * Middleware: authenticate
 */
const getLicenseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const businessId = req.business._id;

    const license = await License.findById(id)
      .populate('mediaId', 'title description url thumbnailUrl')
      .populate('licensorId', 'companyName companyType industry')
      .populate('licenseeId', 'companyName companyType industry');

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: `License with ID ${id} not found`
      });
    }

    // Check if business has access to this license
    const isLicensor = license.licensorId._id.toString() === businessId.toString();
    const isLicensee = license.licenseeId._id.toString() === businessId.toString();

    if (!isLicensor && !isLicensee) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this license'
      });
    }

    res.json({
      success: true,
      data: license
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: `License with ID ${req.params.id} not found`
      });
    }
    next(error);
  }
};

/**
 * Approve license
 * PUT /api/licenses/:id/approve
 * Middleware: authenticate, requireVerifiedBusiness, checkActiveLicenseLimit
 * Increment active license count on success
 */
const approveLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const businessId = req.business._id;

    const license = await License.findById(id)
      .populate('mediaId')
      .populate('licensorId');

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: `License with ID ${id} not found`
      });
    }

    // Validate user owns the media
    const media = await Media.findById(license.mediaId._id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: 'The media associated with this license was not found'
      });
    }

    if (media.ownerId.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not own the media associated with this license. Only the media owner can approve licenses.'
      });
    }

    // Validate license is in pending status
    if (license.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `License is not in pending status. Current status: ${license.status}`,
        currentStatus: license.status,
        requiredStatus: 'pending'
      });
    }

    // Check active license limit (additional validation in controller)
    const licensee = await Business.findById(license.licenseeId._id);
    if (licensee) {
      const canCreateActiveLicense = licensee.canCreateActiveLicense();
      if (!canCreateActiveLicense) {
        return res.status(403).json({
          success: false,
          error: 'Active license limit reached',
          message: 'Active license limit reached (3 active). Upgrade to Contributor for unlimited active licenses.',
          currentActiveLicenses: licensee.activeLicenseCount || 0,
          activeLicenseLimit: 3,
          upgradeUrl: '/api/subscriptions/upgrade'
        });
      }
    }

    // Calculate expiry date (default 1 year if not specified in terms)
    let expiresAt = null;
    if (license.terms && license.terms.duration) {
      // Parse duration (e.g., "1 year", "6 months")
      const duration = license.terms.duration.toLowerCase();
      const now = new Date();
      if (duration.includes('year')) {
        const years = parseInt(duration) || 1;
        expiresAt = new Date(now.setFullYear(now.getFullYear() + years));
      } else if (duration.includes('month')) {
        const months = parseInt(duration) || 12;
        expiresAt = new Date(now.setMonth(now.getMonth() + months));
      } else {
        // Default to 1 year
        expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
      }
    } else {
      // Default to 1 year
      const now = new Date();
      expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
    }

    // Update license status to active
    license.status = 'active';
    license.approvedAt = new Date();
    license.expiresAt = expiresAt;
    await license.save();

    // Increment active license count for licensee (Refined Model)
    // Reuse licensee variable from above
    if (licensee) {
      licensee.activeLicenseCount = (licensee.activeLicenseCount || 0) + 1;
      await licensee.save();
    }

    // Add license to media's active licenses
    // Reuse media variable from above
    if (media) {
      if (!media.activeLicenses) {
        media.activeLicenses = [];
      }
      media.activeLicenses.push(license._id);
      media.licenseCount = (media.licenseCount || 0) + 1;
      await media.save();
    }

    // Populate license details
    await license.populate('mediaId', 'title description url thumbnailUrl');
    await license.populate('licensorId', 'companyName companyType industry');
    await license.populate('licenseeId', 'companyName companyType industry');

    res.json({
      success: true,
      message: 'License approved successfully',
      data: license
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: `License with ID ${req.params.id} not found`
      });
    }
    next(error);
  }
};

/**
 * Reject license
 * PUT /api/licenses/:id/reject
 * Middleware: authenticate, requireVerifiedBusiness
 * Body: { reason }
 */
const rejectLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const businessId = req.business._id;

    const license = await License.findById(id);

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: `License with ID ${id} not found`
      });
    }

    // Check if business is the licensor
    if (license.licensorId.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the licensor can reject this license'
      });
    }

    // Check if license is in pending status
    if (license.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `License is not in pending status. Current status: ${license.status}`
      });
    }

    // Update license status
    license.status = 'rejected';
    license.rejectedAt = new Date();
    license.rejectionReason = reason || 'No reason provided';
    await license.save();

    // Populate license details
    await license.populate('mediaId', 'title description url thumbnailUrl');
    await license.populate('licensorId', 'companyName companyType industry');
    await license.populate('licenseeId', 'companyName companyType industry');

    res.json({
      success: true,
      message: 'License rejected successfully',
      data: license
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: `License with ID ${req.params.id} not found`
      });
    }
    next(error);
  }
};

/**
 * Cancel license
 * PUT /api/licenses/:id/cancel
 * Middleware: authenticate
 * Decrement active license count on success
 */
const cancelLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const businessId = req.business._id;

    const license = await License.findById(id);

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: `License with ID ${id} not found`
      });
    }

    // Check if business is the licensee or licensor
    const isLicensee = license.licenseeId.toString() === businessId.toString();
    const isLicensor = license.licensorId.toString() === businessId.toString();

    if (!isLicensee && !isLicensor) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have permission to cancel this license'
      });
    }

    // Check if license can be cancelled (must be active or approved)
    if (!['active', 'approved'].includes(license.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `License cannot be cancelled. Current status: ${license.status}`
      });
    }

    // Update license status
    const wasActive = license.status === 'active';
    license.status = 'cancelled';
    await license.save();

    // Decrement active license count if license was active (Refined Model)
    if (wasActive) {
      const licensee = await Business.findById(license.licenseeId);
      if (licensee && licensee.activeLicenseCount > 0) {
        licensee.activeLicenseCount = licensee.activeLicenseCount - 1;
        await licensee.save();
      }

      // Remove license from media's active licenses
      const media = await Media.findById(license.mediaId);
      if (media && media.activeLicenses) {
        media.activeLicenses = media.activeLicenses.filter(
          lid => lid.toString() !== license._id.toString()
        );
        await media.save();
      }
    }

    // Populate license details
    await license.populate('mediaId', 'title description url thumbnailUrl');
    await license.populate('licensorId', 'companyName companyType industry');
    await license.populate('licenseeId', 'companyName companyType industry');

    res.json({
      success: true,
      message: 'License cancelled successfully',
      data: license
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: `License with ID ${req.params.id} not found`
      });
    }
    next(error);
  }
};

/**
 * Download licensed media
 * GET /api/media/:id/download
 * Middleware: authenticate, checkDownloadLimit
 * Increment download count on success
 */
const downloadLicensedMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const businessId = req.business._id;

    // Find active license for this media and licensee
    const license = await License.findOne({
      mediaId: id,
      licenseeId: businessId,
      status: 'active'
    }).populate('mediaId');

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: 'You do not have an active license for this media'
      });
    }

    // Check if license has expired
    if (license.expiresAt && new Date() > license.expiresAt) {
      // Update license status to expired
      license.status = 'expired';
      await license.save();

      // Decrement active license count
      const licensee = await Business.findById(businessId);
      if (licensee && licensee.activeLicenseCount > 0) {
        licensee.activeLicenseCount = licensee.activeLicenseCount - 1;
        await licensee.save();
      }

      return res.status(403).json({
        success: false,
        error: 'License expired',
        message: 'Your license for this media has expired'
      });
    }

    const media = license.mediaId;

    // Increment download count for licensee (Refined Model)
    const licensee = await Business.findById(businessId);
    if (licensee) {
      licensee.downloadCount = (licensee.downloadCount || 0) + 1;
      await licensee.save();
    }

    // Return media download URL
    res.json({
      success: true,
      message: 'Media download authorized',
      data: {
        mediaId: media._id,
        title: media.title,
        downloadUrl: media.url,
        thumbnailUrl: media.thumbnailUrl,
        license: {
          id: license._id,
          licenseType: license.licenseType,
          expiresAt: license.expiresAt,
          terms: license.terms
        }
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${req.params.id} not found`
      });
    }
    next(error);
  }
};

/**
 * Get active licenses
 * GET /api/licenses/active
 * Middleware: authenticate
 */
const getActiveLicenses = async (req, res, next) => {
  try {
    const businessId = req.business._id;

    const licenses = await License.find({
      $or: [
        { licensorId: businessId },
        { licenseeId: businessId }
      ],
      status: 'active'
    })
      .populate('mediaId', 'title description url thumbnailUrl')
      .populate('licensorId', 'companyName companyType industry')
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
 * Get expired licenses
 * GET /api/licenses/expired
 * Middleware: authenticate
 * Decrement active license count on expiry
 */
const getExpiredLicenses = async (req, res, next) => {
  try {
    const businessId = req.business._id;
    const now = new Date();

    // Find licenses that have expired
    const expiredLicenses = await License.find({
      $or: [
        { licensorId: businessId },
        { licenseeId: businessId }
      ],
      status: 'active',
      expiresAt: { $lt: now }
    })
      .populate('mediaId')
      .populate('licenseeId');

    // Update expired licenses and decrement active license count
    const updatedLicenses = [];
    for (const license of expiredLicenses) {
      // Update license status to expired
      license.status = 'expired';
      await license.save();

      // Decrement active license count for licensee (Refined Model)
      const licensee = await Business.findById(license.licenseeId._id);
      if (licensee && licensee.activeLicenseCount > 0) {
        licensee.activeLicenseCount = licensee.activeLicenseCount - 1;
        await licensee.save();
      }

      // Remove license from media's active licenses
      const media = await Media.findById(license.mediaId._id);
      if (media && media.activeLicenses) {
        media.activeLicenses = media.activeLicenses.filter(
          lid => lid.toString() !== license._id.toString()
        );
        await media.save();
      }

      updatedLicenses.push(license);
    }

    // Also get licenses that are already marked as expired
    const alreadyExpired = await License.find({
      $or: [
        { licensorId: businessId },
        { licenseeId: businessId }
      ],
      status: 'expired'
    })
      .populate('mediaId', 'title description url thumbnailUrl')
      .populate('licensorId', 'companyName companyType industry')
      .populate('licenseeId', 'companyName companyType industry')
      .sort({ expiresAt: -1 });

    // Combine both sets
    const allExpired = [...updatedLicenses, ...alreadyExpired];

    // Populate updated licenses
    for (const license of updatedLicenses) {
      await license.populate('mediaId', 'title description url thumbnailUrl');
      await license.populate('licensorId', 'companyName companyType industry');
      await license.populate('licenseeId', 'companyName companyType industry');
    }

    res.json({
      success: true,
      count: allExpired.length,
      newlyExpired: updatedLicenses.length,
      data: allExpired
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Renew license
 * PUT /api/licenses/:id/renew
 * Middleware: authenticate, checkActiveLicenseLimit
 * Body: { duration }
 */
const renewLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { duration } = req.body;
    const businessId = req.business._id;

    const license = await License.findById(id)
      .populate('mediaId')
      .populate('licenseeId');

    if (!license) {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: `License with ID ${id} not found`
      });
    }

    // Check if business is the licensee
    if (license.licenseeId._id.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the licensee can renew this license'
      });
    }

    // Check if license can be renewed (must be active or expired)
    if (!['active', 'expired'].includes(license.status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: `License cannot be renewed. Current status: ${license.status}`
      });
    }

    // Calculate new expiry date
    let expiresAt = null;
    const renewalDuration = duration || license.terms?.duration || '1 year';
    const durationStr = renewalDuration.toLowerCase();
    const now = new Date();

    if (durationStr.includes('year')) {
      const years = parseInt(durationStr) || 1;
      expiresAt = new Date(now.setFullYear(now.getFullYear() + years));
    } else if (durationStr.includes('month')) {
      const months = parseInt(durationStr) || 12;
      expiresAt = new Date(now.setMonth(now.getMonth() + months));
    } else {
      // Default to 1 year
      expiresAt = new Date(now.setFullYear(now.getFullYear() + 1));
    }

    // Update license
    const wasExpired = license.status === 'expired';
    license.status = 'active';
    license.expiresAt = expiresAt;
    
    // Update terms duration if provided
    if (duration) {
      if (!license.terms) {
        license.terms = {};
      }
      license.terms.duration = duration;
    }

    await license.save();

    // If license was expired, increment active license count (Refined Model)
    if (wasExpired) {
      const licensee = await Business.findById(businessId);
      if (licensee) {
        licensee.activeLicenseCount = (licensee.activeLicenseCount || 0) + 1;
        await licensee.save();
      }

      // Add license back to media's active licenses
      const media = await Media.findById(license.mediaId._id);
      if (media) {
        if (!media.activeLicenses) {
          media.activeLicenses = [];
        }
        if (!media.activeLicenses.some(lid => lid.toString() === license._id.toString())) {
          media.activeLicenses.push(license._id);
        }
        await media.save();
      }
    }

    // Populate license details
    await license.populate('mediaId', 'title description url thumbnailUrl');
    await license.populate('licensorId', 'companyName companyType industry');
    await license.populate('licenseeId', 'companyName companyType industry');

    res.json({
      success: true,
      message: 'License renewed successfully',
      data: license
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'License not found',
        message: `License with ID ${req.params.id} not found`
      });
    }
    next(error);
  }
};

/**
 * Get licenses for media
 * GET /api/media/:id/licenses
 * Middleware: authenticate
 */
const getMediaLicenses = async (req, res, next) => {
  try {
    const { id } = req.params;
    const businessId = req.business._id;

    // Check if media exists
    const media = await Media.findById(id);
    if (!media) {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${id} not found`
      });
    }

    // Find all licenses for this media
    const licenses = await License.find({
      mediaId: id
    })
      .populate('licensorId', 'companyName companyType industry')
      .populate('licenseeId', 'companyName companyType industry')
      .sort({ createdAt: -1 });

    // Filter licenses based on business role
    // If business is the owner (licensor), show all licenses
    // If business is a licensee, only show their own licenses
    // Otherwise, show public info only
    const isOwner = media.ownerId && media.ownerId.toString() === businessId.toString();
    let filteredLicenses = licenses;

    if (!isOwner) {
      // Only show licenses where business is the licensee
      filteredLicenses = licenses.filter(
        license => license.licenseeId._id.toString() === businessId.toString()
      );
    }

    res.json({
      success: true,
      count: filteredLicenses.length,
      isOwner: isOwner,
      data: filteredLicenses
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Media not found',
        message: `Media with ID ${req.params.id} not found`
      });
    }
    next(error);
  }
};

module.exports = {
  createLicenseRequest,
  getPendingLicenses,
  getLicenseRequests,
  listLicenses,
  getLicenseById,
  approveLicense,
  rejectLicense,
  cancelLicense,
  downloadLicensedMedia,
  getActiveLicenses,
  getExpiredLicenses,
  renewLicense,
  getMediaLicenses
};

