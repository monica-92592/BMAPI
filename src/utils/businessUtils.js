const { getTierConfig, getTierLimit } = require('../config/tiers');

/**
 * Calculate membership tier based on subscription
 * @param {Object} business - Business object
 * @returns {String} - Membership tier
 */
const calculateMembershipTier = (business) => {
  // If business already has a tier, return it
  if (business.membershipTier) {
    return business.membershipTier;
  }
  
  // Default to free tier
  return 'free';
};

/**
 * Calculate voting power based on tier
 * @param {Object} business - Business object
 * @returns {Number} - Voting power
 */
const calculateVotingPower = (business) => {
  const tierVotes = {
    'free': 1,
    'contributor': 2,
    'partner': 3,
    'equityPartner': 5
  };
  
  const baseVotes = tierVotes[business.membershipTier] || 0;
  // Add governance participation bonus (1 vote per 10 participations)
  const participationBonus = Math.floor((business.governanceParticipation || 0) / 10);
  
  return baseVotes + participationBonus;
};

/**
 * Calculate revenue split based on tier
 * @param {Object} business - Business object
 * @returns {Object} - Revenue split { creator, platform }
 */
const calculateRevenueSplit = (business) => {
  const tier = business.membershipTier || 'free';
  
  switch (tier) {
    case 'free':
      return { creator: 80, platform: 20 };
    case 'contributor':
      return { creator: 85, platform: 15 };
    case 'partner':
      return { creator: 90, platform: 10 };
    case 'equityPartner':
      return { creator: 95, platform: 5 };
    default:
      return { creator: 80, platform: 20 };
  }
};

/**
 * Check if business can upload
 * @param {Object} business - Business object
 * @returns {Object} - { canUpload: Boolean, message?: String }
 */
const checkUploadLimit = async (business) => {
  if (!business) {
    return { canUpload: false, message: 'Business not found' };
  }
  
  const tier = business.membershipTier || 'free';
  const uploadLimit = getTierLimit(tier, 'upload');
  
  // Unlimited for paid tiers
  if (uploadLimit === null) {
    return { canUpload: true };
  }
  
  // Check limit for free tier
  const currentUploads = business.uploadCount || 0;
  if (currentUploads >= uploadLimit) {
    return {
      canUpload: false,
      message: `Upload limit reached (${currentUploads}/${uploadLimit}). Upgrade to Contributor for unlimited uploads.`,
      currentUploads,
      uploadLimit
    };
  }
  
  return { canUpload: true, currentUploads, uploadLimit };
};

/**
 * Check if business can download (with monthly reset)
 * @param {Object} business - Business object
 * @returns {Object} - { canDownload: Boolean, message?: String, reset?: Boolean }
 */
const checkDownloadLimit = async (business) => {
  if (!business) {
    return { canDownload: false, message: 'Business not found' };
  }
  
  const tier = business.membershipTier || 'free';
  const downloadLimit = getTierLimit(tier, 'download');
  
  // Unlimited for paid tiers
  if (downloadLimit === null) {
    return { canDownload: true };
  }
  
  // Check if monthly reset needed
  const now = new Date();
  const lastReset = business.lastDownloadReset || business.createdAt || now;
  const monthDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + 
                    (now.getMonth() - lastReset.getMonth());
  
  let resetPerformed = false;
  let currentDownloads = business.downloadCount || 0;
  
  // Reset if a month has passed
  if (monthDiff >= 1) {
    currentDownloads = 0;
    resetPerformed = true;
  }
  
  // Check limit for free tier
  if (currentDownloads >= downloadLimit) {
    return {
      canDownload: false,
      message: `Download limit reached (${currentDownloads}/${downloadLimit} per month). Upgrade to Contributor for unlimited downloads.`,
      currentDownloads,
      downloadLimit,
      resetPerformed
    };
  }
  
  return {
    canDownload: true,
    currentDownloads,
    downloadLimit,
    resetPerformed
  };
};

/**
 * Reset download count monthly
 * @param {Object} business - Business object
 * @returns {Object} - Updated business object
 */
const resetDownloadLimit = async (business) => {
  if (!business) {
    throw new Error('Business not found');
  }
  
  const now = new Date();
  const lastReset = business.lastDownloadReset || business.createdAt || now;
  const monthDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + 
                    (now.getMonth() - lastReset.getMonth());
  
  // Reset if a month has passed
  if (monthDiff >= 1) {
    business.downloadCount = 0;
    business.lastDownloadReset = now;
    await business.save();
    return { reset: true, business };
  }
  
  return { reset: false, business };
};

/**
 * Check if business can create active license
 * @param {Object} business - Business object
 * @returns {Object} - { canCreate: Boolean, message?: String }
 */
const checkActiveLicenseLimit = async (business) => {
  if (!business) {
    return { canCreate: false, message: 'Business not found' };
  }
  
  const tier = business.membershipTier || 'free';
  const activeLicenseLimit = getTierLimit(tier, 'activeLicense');
  
  // Unlimited for paid tiers
  if (activeLicenseLimit === null) {
    return { canCreate: true };
  }
  
  // Check limit for free tier
  const currentActiveLicenses = business.activeLicenseCount || 0;
  if (currentActiveLicenses >= activeLicenseLimit) {
    return {
      canCreate: false,
      message: `Active license limit reached (${currentActiveLicenses}/${activeLicenseLimit}). Upgrade to Contributor for unlimited active licenses.`,
      currentActiveLicenses,
      activeLicenseLimit
    };
  }
  
  return { canCreate: true, currentActiveLicenses, activeLicenseLimit };
};

module.exports = {
  calculateMembershipTier,
  calculateVotingPower,
  calculateRevenueSplit,
  checkUploadLimit,
  checkDownloadLimit,
  checkActiveLicenseLimit,
  resetDownloadLimit
};

