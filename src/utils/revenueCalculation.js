/**
 * Revenue Calculation Utilities
 * 
 * Core business logic for revenue calculations using Option C fee splitting model.
 * 
 * Option C Fee Splitting Model:
 * - Payment processing fees (Stripe) are deducted BEFORE revenue split
 * - Formula: grossAmount - stripeFee = netAmount
 * - Revenue split is calculated from netAmount (not grossAmount)
 * - This ensures creators and platform share the fee burden proportionally
 * 
 * Example (Free Tier - 80/20 split):
 * - Gross Amount: $100.00
 * - Stripe Fee: $3.20 (2.9% + $0.30)
 * - Net Amount: $96.80
 * - Creator Share: $77.44 (80% of $96.80)
 * - Platform Share: $19.36 (20% of $96.80)
 * 
 * Chargeback Reserve:
 * - 5% of creator share held for 90 days
 * - Protects platform from chargeback losses
 * - Released after 90 days if no chargeback
 * 
 * Pool Revenue Distribution:
 * - Base revenue split calculated first
 * - Creator share distributed among pool members
 * - Distribution based on contribution percentage
 * - Each member gets their share minus chargeback reserve
 * 
 * @module utils/revenueCalculation
 * @requires config/tiers
 */

const { TIER_CONFIG } = require('../config/tiers');

/**
 * Calculate Stripe processing fee
 * 
 * Formula: (amount × 0.029) + 0.30
 * This is Stripe's standard fee for US cards (2.9% + $0.30)
 * 
 * @param {number} grossAmount - Gross amount before fees
 * @returns {number} Stripe processing fee (rounded to 2 decimals)
 * @throws {Error} If grossAmount is negative
 * 
 * @example
 * calculateStripeFee(100.00) // Returns 3.20
 * calculateStripeFee(50.00)  // Returns 1.75
 */
function calculateStripeFee(grossAmount) {
  // Input validation
  if (typeof grossAmount !== 'number' || isNaN(grossAmount)) {
    throw new Error('Gross amount must be a valid number');
  }
  
  if (grossAmount < 0) {
    throw new Error('Gross amount cannot be negative');
  }
  
  // Calculate fee: 2.9% + $0.30
  const fee = (grossAmount * 0.029) + 0.30;
  
  // Round to 2 decimal places (cents)
  return Math.round(fee * 100) / 100;
}

/**
 * Calculate revenue split based on tier configuration (Option C)
 * 
 * This function implements Option C fee splitting:
 * 1. Calculate Stripe fee from gross amount
 * 2. Calculate net amount (gross - fee)
 * 3. Split net amount based on tier revenue split percentages
 * 4. Round all amounts to 2 decimal places
 * 
 * @param {number} grossAmount - Gross amount before fees
 * @param {Object} tierConfig - Tier configuration object with revenueSplit property
 * @param {Object} tierConfig.revenueSplit - Revenue split percentages
 * @param {number} tierConfig.revenueSplit.creator - Creator percentage (0-100)
 * @param {number} tierConfig.revenueSplit.platform - Platform percentage (0-100)
 * @returns {Object} Revenue split breakdown
 * @returns {number} returns.grossAmount - Original gross amount
 * @returns {number} returns.stripeFee - Stripe processing fee
 * @returns {number} returns.netAmount - Amount after Stripe fee
 * @returns {number} returns.creatorShare - Creator's portion
 * @returns {number} returns.platformShare - Platform's portion
 * @throws {Error} If tierConfig is invalid or percentages don't total 100%
 * 
 * @example
 * const tierConfig = { revenueSplit: { creator: 80, platform: 20 } };
 * calculateRevenueSplit(100.00, tierConfig)
 * // Returns: {
 * //   grossAmount: 100.00,
 * //   stripeFee: 3.20,
 * //   netAmount: 96.80,
 * //   creatorShare: 77.44,
 * //   platformShare: 19.36
 * // }
 */
function calculateRevenueSplit(grossAmount, tierConfig) {
  // Input validation
  if (typeof grossAmount !== 'number' || isNaN(grossAmount)) {
    throw new Error('Gross amount must be a valid number');
  }
  
  if (grossAmount < 0) {
    throw new Error('Gross amount cannot be negative');
  }
  
  if (!tierConfig || typeof tierConfig !== 'object') {
    throw new Error('Tier config must be an object');
  }
  
  if (!tierConfig.revenueSplit || typeof tierConfig.revenueSplit !== 'object') {
    throw new Error('Tier config must have revenueSplit property');
  }
  
  const { creator, platform } = tierConfig.revenueSplit;
  
  if (typeof creator !== 'number' || typeof platform !== 'number') {
    throw new Error('Revenue split percentages must be numbers');
  }
  
  // Validate percentages total 100%
  const total = creator + platform;
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Revenue split must total 100%, got ${total}%`);
  }
  
  // Calculate Stripe fee
  const stripeFee = calculateStripeFee(grossAmount);
  
  // Calculate net amount (after Stripe fee)
  const netAmount = grossAmount - stripeFee;
  
  // Calculate shares from net amount (Option C)
  const creatorShare = (netAmount * creator) / 100;
  const platformShare = (netAmount * platform) / 100;
  
  // Round all amounts to 2 decimal places
  return {
    grossAmount: Math.round(grossAmount * 100) / 100,
    stripeFee: Math.round(stripeFee * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
    creatorShare: Math.round(creatorShare * 100) / 100,
    platformShare: Math.round(platformShare * 100) / 100
  };
}

/**
 * Calculate chargeback reserve breakdown
 * 
 * Chargeback Reserve Policy:
 * - 5% of creator share held for 90 days
 * - Protects platform from chargeback losses
 * - Immediate payout: 95% of creator share
 * - Reserve released after 90 days if no chargeback
 * 
 * @param {number} creatorShare - Creator's share amount
 * @returns {Object} Chargeback reserve breakdown
 * @returns {number} returns.totalCreatorShare - Original creator share
 * @returns {number} returns.reserveAmount - Amount held in reserve (5%)
 * @returns {number} returns.immediatePayout - Amount paid immediately (95%)
 * @returns {Date} returns.reserveReleaseDate - Date when reserve will be released
 * @throws {Error} If creatorShare is negative
 * 
 * @example
 * calculateChargebackReserve(77.44)
 * // Returns: {
 * //   totalCreatorShare: 77.44,
 * //   reserveAmount: 3.87,
 * //   immediatePayout: 73.57,
 * //   reserveReleaseDate: Date (90 days from now)
 * // }
 */
function calculateChargebackReserve(creatorShare) {
  // Input validation
  if (typeof creatorShare !== 'number' || isNaN(creatorShare)) {
    throw new Error('Creator share must be a valid number');
  }
  
  if (creatorShare < 0) {
    throw new Error('Creator share cannot be negative');
  }
  
  // Calculate 5% reserve
  const reserveAmount = (creatorShare * 0.05);
  
  // Calculate immediate payout (95%)
  const immediatePayout = creatorShare - reserveAmount;
  
  // Calculate release date (90 days from now)
  const reserveReleaseDate = new Date();
  reserveReleaseDate.setDate(reserveReleaseDate.getDate() + 90);
  
  // Round amounts to 2 decimal places
  return {
    totalCreatorShare: Math.round(creatorShare * 100) / 100,
    reserveAmount: Math.round(reserveAmount * 100) / 100,
    immediatePayout: Math.round(immediatePayout * 100) / 100,
    reserveReleaseDate
  };
}

/**
 * Calculate individual pool member's share
 * 
 * @param {number} totalPoolShare - Total creator share for the pool
 * @param {number} contributionPercent - Member's contribution percentage (0-100)
 * @returns {number} Member's share amount (rounded to 2 decimals)
 * @throws {Error} If contributionPercent is invalid
 * 
 * @example
 * calculatePoolMemberShare(77.44, 50) // Returns 38.72 (50% of pool share)
 */
function calculatePoolMemberShare(totalPoolShare, contributionPercent) {
  // Input validation
  if (typeof totalPoolShare !== 'number' || isNaN(totalPoolShare)) {
    throw new Error('Total pool share must be a valid number');
  }
  
  if (totalPoolShare < 0) {
    throw new Error('Total pool share cannot be negative');
  }
  
  if (typeof contributionPercent !== 'number' || isNaN(contributionPercent)) {
    throw new Error('Contribution percentage must be a valid number');
  }
  
  if (contributionPercent < 0 || contributionPercent > 100) {
    throw new Error('Contribution percentage must be between 0 and 100');
  }
  
  // Calculate member's share
  const memberShare = (totalPoolShare * contributionPercent) / 100;
  
  // Round to 2 decimal places
  return Math.round(memberShare * 100) / 100;
}

/**
 * Calculate pool revenue distribution
 * 
 * This function calculates how pool revenue is distributed among members:
 * 1. Calculate base revenue split (gross → net → creator share)
 * 2. Validate member contributions total 100%
 * 3. Distribute creator share among members based on contribution percentages
 * 4. Calculate chargeback reserve for each member
 * 
 * @param {number} grossAmount - Gross amount before fees
 * @param {Object} tierConfig - Tier configuration object
 * @param {Array<Object>} members - Array of pool members
 * @param {string} members[].businessId - Member's business ID
 * @param {number} members[].contributionPercent - Member's contribution percentage (0-100)
 * @returns {Object} Pool distribution breakdown
 * @returns {Object} returns.baseSplit - Base revenue split
 * @returns {Array<Object>} returns.memberDistributions - Distribution for each member
 * @returns {number} returns.totalDistributed - Total amount distributed
 * @throws {Error} If member contributions don't total 100%
 * 
 * @example
 * const members = [
 *   { businessId: '123', contributionPercent: 50 },
 *   { businessId: '456', contributionPercent: 50 }
 * ];
 * calculatePoolDistribution(100.00, tierConfig, members)
 */
function calculatePoolDistribution(grossAmount, tierConfig, members) {
  // Input validation
  if (typeof grossAmount !== 'number' || isNaN(grossAmount) || grossAmount < 0) {
    throw new Error('Gross amount must be a valid non-negative number');
  }
  
  if (!tierConfig || typeof tierConfig !== 'object') {
    throw new Error('Tier config must be an object');
  }
  
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error('Members must be a non-empty array');
  }
  
  // Calculate base revenue split
  const baseSplit = calculateRevenueSplit(grossAmount, tierConfig);
  
  // Validate member contributions total 100%
  const totalContribution = members.reduce((sum, member) => {
    if (typeof member.contributionPercent !== 'number' || isNaN(member.contributionPercent)) {
      throw new Error('All members must have valid contribution percentages');
    }
    return sum + member.contributionPercent;
  }, 0);
  
  if (Math.abs(totalContribution - 100) > 0.01) {
    throw new Error(`Member contributions must total 100%, got ${totalContribution}%`);
  }
  
  // Distribute creator share among members
  const memberDistributions = members.map(member => {
    const memberShare = calculatePoolMemberShare(
      baseSplit.creatorShare,
      member.contributionPercent
    );
    
    const reserve = calculateChargebackReserve(memberShare);
    
    return {
      businessId: member.businessId,
      contributionPercent: member.contributionPercent,
      totalShare: memberShare,
      reserveAmount: reserve.reserveAmount,
      immediatePayout: reserve.immediatePayout,
      reserveReleaseDate: reserve.reserveReleaseDate
    };
  });
  
  // Calculate total distributed
  const totalDistributed = memberDistributions.reduce(
    (sum, member) => sum + member.totalShare,
    0
  );
  
  // Validate total distributed equals creator share (within rounding tolerance)
  if (Math.abs(totalDistributed - baseSplit.creatorShare) > 0.01) {
    throw new Error(
      `Distribution error: total distributed (${totalDistributed}) ` +
      `!= creator share (${baseSplit.creatorShare})`
    );
  }
  
  return {
    baseSplit,
    memberDistributions,
    totalDistributed: Math.round(totalDistributed * 100) / 100
  };
}

/**
 * Calculate revenue splits for all tiers
 * 
 * This function calculates revenue splits for all 4 membership tiers
 * to allow comparison and display to users.
 * 
 * @param {number} grossAmount - Gross amount before fees
 * @returns {Object} Revenue splits for all tiers
 * @returns {Object} returns.free - Free tier split (80/20)
 * @returns {Object} returns.contributor - Contributor tier split (85/15)
 * @returns {Object} returns.partner - Partner tier split (90/10)
 * @returns {Object} returns.equityPartner - Equity Partner tier split (95/5)
 * 
 * @example
 * calculateAllTierSplits(100.00)
 * // Returns splits for all 4 tiers
 */
function calculateAllTierSplits(grossAmount) {
  // Input validation
  if (typeof grossAmount !== 'number' || isNaN(grossAmount)) {
    throw new Error('Gross amount must be a valid number');
  }
  
  if (grossAmount < 0) {
    throw new Error('Gross amount cannot be negative');
  }
  
  // Calculate splits for all tiers
  return {
    free: calculateRevenueSplit(grossAmount, TIER_CONFIG.free),
    contributor: calculateRevenueSplit(grossAmount, TIER_CONFIG.contributor),
    partner: calculateRevenueSplit(grossAmount, TIER_CONFIG.partner),
    equityPartner: calculateRevenueSplit(grossAmount, TIER_CONFIG.equityPartner)
  };
}

// Export all functions
module.exports = {
  calculateStripeFee,
  calculateRevenueSplit,
  calculateChargebackReserve,
  calculatePoolMemberShare,
  calculatePoolDistribution,
  calculateAllTierSplits
};

