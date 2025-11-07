const TIER_CONFIG = {
  free: {
    name: 'Free',
    price: 0,
    stripePriceId: null,
    
    // Limits
    uploadLimit: 25, // Total lifetime uploads
    downloadLimit: 50, // Per month
    activeLicenseLimit: 3,
    
    // Revenue Split (Option C - after processing fees)
    revenueSplit: { 
      creator: 80, 
      platform: 20 
    },
    feeModel: 'option_c', // Fees deducted before split
    
    // Features
    features: {
      apiAccess: false,
      prioritySupport: false,
      poolCreation: false,
      analytics: false,
      featuredListing: false,
      customBranding: false,
      bulkUpload: false
    },
    
    // Marketing copy
    description: 'Get started with basic features',
    tagline: 'Perfect for trying out the platform',
    
    // Revenue explanation for users
    revenueExplanation: 'You receive 80% of net revenue (after payment processing fees). ' +
                        'Example: On a $100 sale, Stripe charges $3.20, leaving $96.80. ' +
                        'You receive $77.44 (80%) and we keep $19.36 (20%).'
  },
  contributor: {
    name: 'Contributor',
    price: 15, // per month
    stripePriceId: process.env.STRIPE_PRICE_CONTRIBUTOR || null,
    
    // Limits
    uploadLimit: null, // Unlimited
    downloadLimit: null, // Unlimited
    activeLicenseLimit: null, // Unlimited
    
    // Revenue Split (Option C)
    revenueSplit: { 
      creator: 85, 
      platform: 15 
    },
    feeModel: 'option_c',
    
    // Features
    features: {
      apiAccess: false,
      prioritySupport: true,
      poolCreation: false,
      analytics: true,
      featuredListing: true,
      customBranding: false,
      bulkUpload: false
    },
    
    // Marketing copy
    description: 'Unlimited uploads, 85/15 revenue split (after processing fees)',
    tagline: 'Serious about licensing? Upload your full portfolio',
    
    // Revenue explanation for users
    revenueExplanation: 'You receive 85% of net revenue (after payment processing fees). ' +
                        'Example: On a $100 sale, Stripe charges $3.20, leaving $96.80. ' +
                        'You receive $82.28 (85%) and we keep $14.52 (15%).'
  },
  partner: {
    name: 'Partner',
    price: 50, // per month
    stripePriceId: process.env.STRIPE_PRICE_PARTNER || null,
    
    // Limits
    uploadLimit: null, // Unlimited
    downloadLimit: null, // Unlimited
    activeLicenseLimit: null, // Unlimited
    
    // Revenue Split (Option C)
    revenueSplit: { 
      creator: 90, 
      platform: 10 
    },
    feeModel: 'option_c',
    
    // Features
    features: {
      apiAccess: true,
      prioritySupport: true,
      poolCreation: true,
      analytics: true,
      featuredListing: true,
      customBranding: false,
      bulkUpload: false
    },
    
    // Marketing copy
    description: 'Unlimited uploads, 90/10 revenue split (after processing fees), API access',
    tagline: 'Build your licensing business with advanced features',
    
    // Revenue explanation for users
    revenueExplanation: 'You receive 90% of net revenue (after payment processing fees). ' +
                        'Example: On a $100 sale, Stripe charges $3.20, leaving $96.80. ' +
                        'You receive $87.12 (90%) and we keep $9.68 (10%).'
  },
  equityPartner: {
    name: 'Equity Partner',
    price: 100, // per month or one-time buy-in
    stripePriceId: process.env.STRIPE_PRICE_EQUITY_PARTNER || null,
    
    // Limits
    uploadLimit: null, // Unlimited
    downloadLimit: null, // Unlimited
    activeLicenseLimit: null, // Unlimited
    
    // Revenue Split (Option C)
    revenueSplit: { 
      creator: 95, 
      platform: 5 
    },
    feeModel: 'option_c',
    
    // Features
    features: {
      apiAccess: true,
      prioritySupport: true,
      poolCreation: true,
      analytics: true,
      featuredListing: true,
      customBranding: true,
      bulkUpload: true,
      ownershipStake: true,
      boardVoting: true
    },
    
    // Marketing copy
    description: 'Unlimited uploads, 95/5 revenue split (after processing fees), ownership stake',
    tagline: 'Own a piece of the platform and maximize your earnings',
    
    // Revenue explanation for users
    revenueExplanation: 'You receive 95% of net revenue (after payment processing fees). ' +
                        'Example: On a $100 sale, Stripe charges $3.20, leaving $96.80. ' +
                        'You receive $91.96 (95%) and we keep $4.84 (5%).'
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

/**
 * Calculate revenue split after payment processing fees
 * @param {number} grossAmount - Gross amount before fees
 * @param {string} tier - Membership tier (free, contributor, partner, equityPartner)
 * @returns {Object} - { creatorAmount, platformAmount, netAmount, stripeFee }
 */
function calculateRevenueSplit(grossAmount, tier) {
  // Stripe fee: 2.9% + $0.30
  const stripeFee = (grossAmount * 0.029) + 0.30;
  const netAmount = grossAmount - stripeFee;
  
  const split = TIER_CONFIG[tier]?.revenueSplit || TIER_CONFIG.free.revenueSplit;
  const creatorAmount = netAmount * (split.creator / 100);
  const platformAmount = netAmount * (split.platform / 100);
  
  return {
    creatorAmount: Math.round(creatorAmount * 100) / 100, // Round to 2 decimal places
    platformAmount: Math.round(platformAmount * 100) / 100, // Round to 2 decimal places
    netAmount: Math.round(netAmount * 100) / 100, // Round to 2 decimal places
    stripeFee: Math.round(stripeFee * 100) / 100 // Round to 2 decimal places
  };
}

module.exports = {
  TIER_CONFIG,
  getTierConfig,
  getTierLimit,
  checkTierFeature,
  calculateRevenueSplit
};

