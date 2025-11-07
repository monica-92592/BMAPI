const TIER_CONFIG = {
  free: {
    name: 'Free',
    price: 0,
    uploadLimit: 25, // or 50, configurable
    downloadLimit: 50, // per month
    activeLicenseLimit: 3,
    revenueSplit: { creator: 80, platform: 20 },
    features: {
      apiAccess: false,
      prioritySupport: false,
      poolCreation: false,
      analytics: false,
      featuredListing: false
    }
  },
  contributor: {
    name: 'Contributor',
    price: 15, // per month
    uploadLimit: null, // Unlimited
    downloadLimit: null, // Unlimited
    activeLicenseLimit: null, // Unlimited
    revenueSplit: { creator: 85, platform: 15 },
    features: {
      apiAccess: false,
      prioritySupport: true,
      poolCreation: false,
      analytics: true,
      featuredListing: true
    }
  },
  partner: {
    name: 'Partner',
    price: 50, // per month
    uploadLimit: null, // Unlimited
    downloadLimit: null, // Unlimited
    activeLicenseLimit: null, // Unlimited
    revenueSplit: { creator: 90, platform: 10 },
    features: {
      apiAccess: true,
      prioritySupport: true,
      poolCreation: true,
      analytics: true,
      featuredListing: true
    }
  },
  equityPartner: {
    name: 'Equity Partner',
    price: 100, // per month or one-time buy-in
    uploadLimit: null, // Unlimited
    downloadLimit: null, // Unlimited
    activeLicenseLimit: null, // Unlimited
    revenueSplit: { creator: 95, platform: 5 },
    features: {
      apiAccess: true,
      prioritySupport: true,
      poolCreation: true,
      analytics: true,
      featuredListing: true,
      ownershipStake: true,
      boardVoting: true
    }
  }
};

// Get tier configuration
const getTierConfig = (tier) => {
  if (!tier || !TIER_CONFIG[tier]) {
    return TIER_CONFIG.free; // Default to free tier
  }
  return TIER_CONFIG[tier];
};

// Get specific limit for tier
const getTierLimit = (tier, limitType) => {
  const config = getTierConfig(tier);
  
  switch (limitType) {
    case 'upload':
      return config.uploadLimit;
    case 'download':
      return config.downloadLimit;
    case 'activeLicense':
      return config.activeLicenseLimit;
    default:
      return null;
  }
};

// Check if tier has feature
const checkTierFeature = (tier, feature) => {
  const config = getTierConfig(tier);
  return config.features[feature] || false;
};

module.exports = {
  TIER_CONFIG,
  getTierConfig,
  getTierLimit,
  checkTierFeature
};

