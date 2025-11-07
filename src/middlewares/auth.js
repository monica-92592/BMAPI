const jwt = require('jsonwebtoken');
const Business = require('../models/Business');
const { getTierLimit } = require('../config/tiers');

/**
 * Calculate voting power based on tier
 */
const calculateVotingPower = (business) => {
  const tierVotes = {
    free: 1,
    contributor: 2,
    partner: 3,
    equityPartner: 5
  };
  return tierVotes[business.membershipTier] || 0;
};

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided. Please provide a Bearer token.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');

    // Get business from database
    const business = await Business.findById(decoded.userId).select('-password');
    
    if (!business) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Business not found'
      });
    }

    // Attach business to request (also attach as user for backward compatibility)
    req.business = business;
    req.user = business; // For backward compatibility

    // Add tier information to request
    // These are already available on business object, but we ensure they're accessible:
    req.business.membershipTier = business.membershipTier || 'free';
    req.business.subscriptionStatus = business.subscriptionStatus || 'active';
    
    // Calculate and attach voting power
    req.business.votingPower = calculateVotingPower(business);
    
    // Include resource limits in request (Refined Model)
    req.business.uploadCount = business.uploadCount || 0;
    req.business.downloadCount = business.downloadCount || 0;
    req.business.activeLicenseCount = business.activeLicenseCount || 0;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Token expired'
      });
    }
    next(error);
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
        const business = await Business.findById(decoded.userId).select('-password');
        if (business) {
          req.business = business;
          req.user = business; // For backward compatibility
        }
      } catch (error) {
        // Ignore token errors for optional auth
      }
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require specific membership tier(s)
 */
const requireMembershipTier = (allowedTiers) => {
  return async (req, res, next) => {
    // Check if user is authenticated
    if (!req.business) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get business from req.business
    // Check if business.membershipTier is in allowedTiers
    if (!allowedTiers.includes(req.business.membershipTier)) {
      // Generate tier-specific error message
      let errorMessage = 'This feature requires a higher membership tier';
      if (allowedTiers.includes('contributor') && !allowedTiers.includes('free')) {
        errorMessage = 'This feature requires Contributor membership ($15/month)';
      } else if (allowedTiers.includes('partner') && !allowedTiers.includes('contributor')) {
        errorMessage = 'This feature requires Partner membership ($50/month)';
      } else if (allowedTiers.includes('equityPartner') && allowedTiers.length === 1) {
        errorMessage = 'This feature requires Equity Partner membership';
      }
      
      return res.status(403).json({
        error: 'Insufficient membership tier',
        message: errorMessage,
        requiredTier: allowedTiers,
        currentTier: req.business.membershipTier,
        upgradeUrl: '/api/subscriptions/upgrade'
      });
    }

    // If yes, continue
    next();
  };
};

/**
 * Require Free tier or higher (allows all tiers)
 */
const requireFreeTier = requireMembershipTier(['free', 'contributor', 'partner', 'equityPartner']);

/**
 * Require Contributor tier or higher (for analytics, priority support)
 */
const requireContributorTier = requireMembershipTier(['contributor', 'partner', 'equityPartner']);

/**
 * Require Partner tier or higher (for API access, pool creation)
 */
const requirePartnerTier = requireMembershipTier(['partner', 'equityPartner']);

/**
 * Require Equity Partner tier
 */
const requireEquityPartnerTier = requireMembershipTier(['equityPartner']);

/**
 * Require verified business
 */
const requireVerifiedBusiness = async (req, res, next) => {
  if (!req.business) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!req.business.isVerified) {
    return res.status(403).json({
      error: 'Business verification required',
      message: 'Please verify your business account'
    });
  }

  next();
};

/**
 * Require active subscription
 */
const requireActiveSubscription = async (req, res, next) => {
  if (!req.business) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.business.membershipTier === 'free') {
    return next(); // Free tier doesn't need subscription
  }

  if (req.business.subscriptionStatus !== 'active') {
    return res.status(403).json({
      error: 'Active subscription required',
      message: 'Your subscription is not active. Please renew your subscription.'
    });
  }

  if (req.business.subscriptionExpiry && new Date() > req.business.subscriptionExpiry) {
    return res.status(403).json({
      error: 'Subscription expired',
      message: 'Your subscription has expired'
    });
  }

  next();
};

/**
 * Check upload limit (Refined Model)
 */
const checkUploadLimit = async (req, res, next) => {
  if (!req.business) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const canUpload = await req.business.canUpload();
  if (!canUpload) {
    const uploadLimit = getTierLimit(req.business.membershipTier, 'upload') || 25;
    return res.status(403).json({
      error: 'Upload limit reached',
      message: 'Upload limit reached. Upgrade to Contributor for unlimited uploads.',
      currentUploads: req.business.uploadCount,
      uploadLimit: uploadLimit, // or 50, from tier config
      upgradeUrl: '/api/subscriptions/upgrade'
    });
  }

  next();
};

/**
 * Check download limit (Refined Model)
 */
const checkDownloadLimit = async (req, res, next) => {
  if (!req.business) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Reset download count if needed (monthly)
  req.business.canDownload(); // This resets if needed
  // Save the business if reset was performed
  if (req.business.isModified('downloadCount') || req.business.isModified('lastDownloadReset')) {
    await req.business.save();
    // Refresh business object
    req.business = await Business.findById(req.business._id).select('-password');
  }
  
  const canDownload = req.business.canDownload();
  
  if (!canDownload) {
    return res.status(403).json({
      error: 'Download limit reached',
      message: 'Download limit reached (50/month). Upgrade to Contributor for unlimited downloads.',
      currentDownloads: req.business.downloadCount,
      downloadLimit: 50,
      resetDate: req.business.lastDownloadReset,
      upgradeUrl: '/api/subscriptions/upgrade'
    });
  }

  next();
};

/**
 * Check active license limit (Refined Model)
 */
const checkActiveLicenseLimit = async (req, res, next) => {
  if (!req.business) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const canCreate = await req.business.canCreateActiveLicense();
  if (!canCreate) {
    return res.status(403).json({
      error: 'Active license limit reached',
      message: 'Active license limit reached (3 active). Upgrade to Contributor for unlimited active licenses.',
      currentActiveLicenses: req.business.activeLicenseCount,
      activeLicenseLimit: 3,
      upgradeUrl: '/api/subscriptions/upgrade'
    });
  }

  next();
};

/**
 * Get revenue split based on tier (Refined Model)
 */
const getRevenueSplit = (business) => {
  const splits = {
    free: { creator: 80, platform: 20 },
    contributor: { creator: 85, platform: 15 },
    partner: { creator: 90, platform: 10 },
    equityPartner: { creator: 95, platform: 5 }
  };
  return splits[business.membershipTier] || splits.free;
};

/**
 * Check if business has access to required tier
 */
const checkTierAccess = (business, requiredTier) => {
  const tierHierarchy = {
    free: 0,
    contributor: 1,
    partner: 2,
    equityPartner: 3
  };
  return tierHierarchy[business.membershipTier] >= tierHierarchy[requiredTier];
};

module.exports = {
  authenticate,
  optionalAuth,
  requireMembershipTier,
  requireFreeTier,
  requireContributorTier,
  requirePartnerTier,
  requireEquityPartnerTier,
  requireVerifiedBusiness,
  requireActiveSubscription,
  checkUploadLimit,
  checkDownloadLimit,
  checkActiveLicenseLimit,
  calculateVotingPower,
  getRevenueSplit,
  checkTierAccess
};

