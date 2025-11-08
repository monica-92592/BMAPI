const Business = require('../models/Business');
const License = require('../models/License');
const Media = require('../models/Media');
const Transaction = require('../models/Transaction');
const { getTierConfig, getTierLimit, TIER_CONFIG } = require('../config/tiers');
const StripeService = require('../services/stripeService');

/**
 * Get business licenses
 * GET /api/business/licenses
 * Middleware: authenticate
 * Query params: asLicensor, asLicensee, status
 */
const getBusinessLicenses = async (req, res, next) => {
  try {
    const { asLicensor, asLicensee, status } = req.query;
    const businessId = req.business._id;

    // Build query
    const query = {};

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

    // Filter by status
    if (status) {
      query.status = status;
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
 * Get license statistics
 * GET /api/business/licenses/stats
 * Middleware: authenticate
 */
const getLicenseStats = async (req, res, next) => {
  try {
    const businessId = req.business._id;

    // Get all licenses for this business
    const allLicenses = await License.find({
      $or: [
        { licensorId: businessId },
        { licenseeId: businessId }
      ]
    });

    // Calculate statistics
    const stats = {
      total: allLicenses.length,
      asLicensor: {
        total: allLicenses.filter(l => l.licensorId.toString() === businessId.toString()).length,
        pending: allLicenses.filter(l => l.licensorId.toString() === businessId.toString() && l.status === 'pending').length,
        active: allLicenses.filter(l => l.licensorId.toString() === businessId.toString() && l.status === 'active').length,
        expired: allLicenses.filter(l => l.licensorId.toString() === businessId.toString() && l.status === 'expired').length,
        rejected: allLicenses.filter(l => l.licensorId.toString() === businessId.toString() && l.status === 'rejected').length,
        cancelled: allLicenses.filter(l => l.licensorId.toString() === businessId.toString() && l.status === 'cancelled').length
      },
      asLicensee: {
        total: allLicenses.filter(l => l.licenseeId.toString() === businessId.toString()).length,
        pending: allLicenses.filter(l => l.licenseeId.toString() === businessId.toString() && l.status === 'pending').length,
        active: allLicenses.filter(l => l.licenseeId.toString() === businessId.toString() && l.status === 'active').length,
        expired: allLicenses.filter(l => l.licenseeId.toString() === businessId.toString() && l.status === 'expired').length,
        rejected: allLicenses.filter(l => l.licenseeId.toString() === businessId.toString() && l.status === 'rejected').length,
        cancelled: allLicenses.filter(l => l.licenseeId.toString() === businessId.toString() && l.status === 'cancelled').length
      },
      byType: {
        commercial: allLicenses.filter(l => l.licenseType === 'commercial').length,
        editorial: allLicenses.filter(l => l.licenseType === 'editorial').length,
        exclusive: allLicenses.filter(l => l.licenseType === 'exclusive').length
      },
      revenue: {
        totalEarnings: 0, // Will be calculated from transaction history
        totalSpent: 0, // Will be calculated from transaction history
        revenueBalance: 0 // From business model
      }
    };

    // Get business to include revenue info
    const business = await Business.findById(businessId);
    if (business) {
      stats.revenue.revenueBalance = business.revenueBalance || 0;
      stats.revenue.totalEarnings = business.totalEarnings || 0;
      stats.revenue.totalSpent = business.totalSpent || 0;
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current limit usage (Refined Model)
 * GET /api/business/limits
 * Middleware: authenticate
 * Response: { uploadCount, uploadLimit, downloadCount, downloadLimit, activeLicenseCount, activeLicenseLimit, tier }
 */
const getBusinessLimits = async (req, res, next) => {
  try {
    const business = req.business;
    const tier = business.membershipTier || 'free';

    // Get limits from tier config
    const uploadLimit = getTierLimit(tier, 'upload');
    const downloadLimit = getTierLimit(tier, 'download');
    const activeLicenseLimit = getTierLimit(tier, 'activeLicense');

    // Get current counts
    const uploadCount = business.uploadCount || 0;
    const downloadCount = business.downloadCount || 0;
    const activeLicenseCount = business.activeLicenseCount || 0;

    // Calculate usage percentages
    const uploadUsage = uploadLimit !== null ? (uploadCount / uploadLimit) * 100 : 0;
    const downloadUsage = downloadLimit !== null ? (downloadCount / downloadLimit) * 100 : 0;
    const activeLicenseUsage = activeLicenseLimit !== null ? (activeLicenseCount / activeLicenseLimit) * 100 : 0;

    res.json({
      success: true,
      data: {
        tier: tier,
        uploadCount: uploadCount,
        uploadLimit: uploadLimit,
        uploadUsage: Math.round(uploadUsage * 100) / 100,
        uploadRemaining: uploadLimit !== null ? Math.max(0, uploadLimit - uploadCount) : null,
        downloadCount: downloadCount,
        downloadLimit: downloadLimit,
        downloadUsage: Math.round(downloadUsage * 100) / 100,
        downloadRemaining: downloadLimit !== null ? Math.max(0, downloadLimit - downloadCount) : null,
        activeLicenseCount: activeLicenseCount,
        activeLicenseLimit: activeLicenseLimit,
        activeLicenseUsage: Math.round(activeLicenseUsage * 100) / 100,
        activeLicenseRemaining: activeLicenseLimit !== null ? Math.max(0, activeLicenseLimit - activeLicenseCount) : null,
        lastDownloadReset: business.lastDownloadReset || business.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get tier information and upgrade options (Refined Model)
 * GET /api/business/tier
 * Middleware: authenticate
 * Response: { currentTier, limits, features, upgradeOptions }
 */
const getTierInfo = async (req, res, next) => {
  try {
    const business = req.business;
    const currentTier = business.membershipTier || 'free';
    const currentTierConfig = getTierConfig(currentTier);

    // Get all tier configurations for upgrade options
    const tierHierarchy = ['free', 'contributor', 'partner', 'equityPartner'];
    const currentTierIndex = tierHierarchy.indexOf(currentTier);
    const upgradeOptions = [];

    // Build upgrade options (only show tiers above current)
    for (let i = currentTierIndex + 1; i < tierHierarchy.length; i++) {
      const tier = tierHierarchy[i];
      const tierConfig = getTierConfig(tier);
      
      upgradeOptions.push({
        tier: tier,
        name: tierConfig.name,
        price: tierConfig.price,
        revenueSplit: tierConfig.revenueSplit,
        features: tierConfig.features,
        benefits: getTierBenefits(tier, currentTierConfig)
      });
    }

    res.json({
      success: true,
      data: {
        currentTier: {
          tier: currentTier,
          name: currentTierConfig.name,
          price: currentTierConfig.price,
          limits: {
            upload: currentTierConfig.uploadLimit,
            download: currentTierConfig.downloadLimit,
            activeLicense: currentTierConfig.activeLicenseLimit
          },
          revenueSplit: currentTierConfig.revenueSplit,
          features: currentTierConfig.features
        },
        upgradeOptions: upgradeOptions
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to get tier benefits compared to current tier
 */
const getTierBenefits = (newTier, currentTierConfig) => {
  const newTierConfig = getTierConfig(newTier);
  const benefits = [];

  // Compare limits
  if (currentTierConfig.uploadLimit !== null && newTierConfig.uploadLimit === null) {
    benefits.push('Unlimited uploads');
  }
  if (currentTierConfig.downloadLimit !== null && newTierConfig.downloadLimit === null) {
    benefits.push('Unlimited downloads');
  }
  if (currentTierConfig.activeLicenseLimit !== null && newTierConfig.activeLicenseLimit === null) {
    benefits.push('Unlimited active licenses');
  }

  // Compare revenue split
  if (newTierConfig.revenueSplit.creator > currentTierConfig.revenueSplit.creator) {
    const improvement = newTierConfig.revenueSplit.creator - currentTierConfig.revenueSplit.creator;
    benefits.push(`Better revenue split (+${improvement}% for creators)`);
  }

  // Compare features
  const newFeatures = Object.keys(newTierConfig.features).filter(
    feature => newTierConfig.features[feature] && !currentTierConfig.features[feature]
  );
  if (newFeatures.length > 0) {
    benefits.push(`New features: ${newFeatures.join(', ')}`);
  }

  return benefits;
};

/**
 * Onboard business to Stripe Connect
 * POST /api/business/stripe/connect/onboard
 * Middleware: authenticate
 */
const onboardStripeConnect = async (req, res, next) => {
  try {
    const businessId = req.business._id; // From authenticate middleware
    const stripeService = new StripeService();
    
    // Check if already onboarded
    const business = await Business.findById(businessId);
    if (business.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        error: 'already_onboarded',
        message: 'Stripe Connect account already exists'
      });
    }
    
    // Create Connect account
    const account = await stripeService.createConnectAccount(businessId);
    
    // Create account link
    const accountLink = await stripeService.createAccountLink(account.id, businessId);
    
    // Update Business model
    business.stripeConnectAccountId = account.id;
    business.stripeConnectStatus = 'pending';
    await business.save();
    
    res.json({
      success: true,
      data: {
        accountId: account.id,
        onboardingUrl: accountLink.url
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Stripe Connect status
 * GET /api/business/stripe/connect/status
 * Middleware: authenticate
 */
const getStripeConnectStatus = async (req, res, next) => {
  try {
    const businessId = req.business._id; // From authenticate middleware
    const business = await Business.findById(businessId);
    
    if (!business.stripeConnectAccountId) {
      return res.json({
        success: true,
        data: {
          status: 'not_started',
          accountId: null
        }
      });
    }
    
    const stripeService = new StripeService();
    const isActive = await stripeService.isAccountActive(business.stripeConnectAccountId);
    
    res.json({
      success: true,
      data: {
        status: isActive ? 'active' : business.stripeConnectStatus,
        accountId: business.stripeConnectAccountId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request payout
 * POST /api/business/payouts/request
 * Middleware: authenticate
 * Body: { amount: number }
 */
const requestPayout = async (req, res, next) => {
  try {
    const businessId = req.business._id; // From authenticate middleware
    const { amount } = req.body;
    
    const business = await Business.findById(businessId);
    
    if (!business.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        error: 'no_connect_account',
        message: 'Stripe Connect account not set up'
      });
    }
    
    // Validate minimum payout ($25)
    const MIN_PAYOUT = 25;
    if (amount < MIN_PAYOUT) {
      return res.status(400).json({
        success: false,
        error: 'below_minimum',
        message: `Minimum payout amount is $${MIN_PAYOUT}`
      });
    }
    
    // Check available balance
    if ((business.revenueBalance || 0) < amount) {
      return res.status(400).json({
        success: false,
        error: 'insufficient_balance',
        message: 'Insufficient balance for payout'
      });
    }
    
    const stripeService = new StripeService();
    const payout = await stripeService.createPayout(
      business.stripeConnectAccountId,
      Math.round(amount * 100), // Convert to cents
      {
        businessId: businessId.toString()
      }
    );
    
    // Create transaction record
    const transaction = await Transaction.create({
      type: 'payout',
      grossAmount: Math.round(amount * 100), // Convert to cents
      stripeFee: 0, // Payouts have no fee
      netAmount: Math.round(amount * 100), // Convert to cents
      creatorShare: Math.round(amount * 100), // Convert to cents
      platformShare: 0,
      status: 'pending',
      stripePayoutId: payout.id,
      payee: businessId,
      description: `Payout request for $${amount}`,
      metadata: {
        payoutId: payout.id
      }
    });
    
    // Update business balance
    business.revenueBalance = (business.revenueBalance || 0) - amount;
    await business.save();
    
    res.json({
      success: true,
      data: {
        payout: {
          id: payout.id,
          amount: amount,
          status: payout.status
        },
        transaction: {
          id: transaction._id
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBusinessLicenses,
  getLicenseStats,
  getBusinessLimits,
  getTierInfo,
  onboardStripeConnect,
  getStripeConnectStatus,
  requestPayout
};

