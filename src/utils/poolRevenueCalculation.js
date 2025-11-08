/**
 * Pool Revenue Calculation Utilities
 * 
 * Utilities for calculating revenue distribution for media pools (collections).
 * Handles:
 * - Base revenue calculation for pools
 * - Member contribution validation
 * - Individual member distribution calculations
 * - Transaction grouping by pool
 * 
 * @module utils/poolRevenueCalculation
 */

const { calculateRevenueSplit, calculateChargebackReserve } = require('./revenueCalculation');

/**
 * Calculate base revenue split for a pool
 * 
 * Calculates the total revenue split for a pool before individual member distribution.
 * This represents the total creator share that will be distributed among pool members.
 * 
 * @param {number} grossAmount - The total gross amount for the pool transaction
 * @param {object} tierConfig - The tier configuration object containing revenueSplit
 * @returns {object} Base revenue split object with grossAmount, stripeFee, netAmount, creatorShare, platformShare
 * @throws {Error} If grossAmount is negative or tierConfig is invalid
 * 
 * @example
 * const tierConfig = { revenueSplit: { creator: 85, platform: 15 } };
 * const baseRevenue = calculatePoolBaseRevenue(100.00, tierConfig);
 * // Returns: { grossAmount: 100, stripeFee: 3.20, netAmount: 96.80, creatorShare: 82.28, platformShare: 14.52 }
 */
function calculatePoolBaseRevenue(grossAmount, tierConfig) {
  // Validate inputs
  if (typeof grossAmount !== 'number' || grossAmount < 0) {
    throw new Error('Gross amount must be a non-negative number');
  }
  
  if (!tierConfig || !tierConfig.revenueSplit) {
    throw new Error('Tier config must have revenueSplit property');
  }
  
  // Use existing revenue split calculation
  return calculateRevenueSplit(grossAmount, tierConfig);
}

/**
 * Validate member contributions sum to 100%
 * 
 * Ensures that all member contribution percentages total exactly 100%.
 * Throws an error if the sum is not 100%.
 * 
 * @param {Array<object>} members - Array of member objects with { businessId, contributionPercent }
 * @returns {boolean} True if contributions are valid (sum to 100%)
 * @throws {Error} If contributions do not sum to 100% or if members array is invalid
 * 
 * @example
 * const members = [
 *   { businessId: '123', contributionPercent: 50 },
 *   { businessId: '456', contributionPercent: 50 }
 * ];
 * validateMemberContributions(members); // Returns: true
 */
function validateMemberContributions(members) {
  // Validate input
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error('Members must be a non-empty array');
  }
  
  // Validate each member has required fields
  members.forEach((member, index) => {
    if (!member.businessId) {
      throw new Error(`Member at index ${index} is missing businessId`);
    }
    if (typeof member.contributionPercent !== 'number') {
      throw new Error(`Member at index ${index} contributionPercent must be a number`);
    }
    if (member.contributionPercent < 0 || member.contributionPercent > 100) {
      throw new Error(`Member at index ${index} contributionPercent must be between 0 and 100`);
    }
  });
  
  // Sum all contribution percentages
  const totalPercent = members.reduce((sum, member) => {
    return sum + member.contributionPercent;
  }, 0);
  
  // Validate sum equals 100%
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Member contributions must sum to 100%. Current sum: ${totalPercent}%`);
  }
  
  return true;
}

/**
 * Calculate individual member distribution from pool creator share
 * 
 * Distributes the pool's creator share among members based on their contribution percentages.
 * Also calculates chargeback reserves for each member.
 * 
 * @param {number} poolCreatorShare - The total creator share for the pool
 * @param {Array<object>} members - Array of member objects with { businessId, contributionPercent }
 * @returns {Array<object>} Array of member distribution objects with:
 *   - businessId: Member's business ID
 *   - contributionPercent: Member's contribution percentage
 *   - memberShare: Member's share of pool creator share
 *   - reserveAmount: Chargeback reserve amount (5% of member share)
 *   - immediatePayout: Amount available for immediate payout (95% of member share)
 *   - reserveReleaseDate: Date when reserve will be released (90 days from now)
 * @throws {Error} If poolCreatorShare is invalid or member contributions are invalid
 * 
 * @example
 * const members = [
 *   { businessId: '123', contributionPercent: 60 },
 *   { businessId: '456', contributionPercent: 40 }
 * ];
 * const distributions = calculateMemberDistribution(100.00, members);
 * // Returns: [
 * //   { businessId: '123', contributionPercent: 60, memberShare: 60.00, reserveAmount: 3.00, immediatePayout: 57.00, reserveReleaseDate: Date },
 * //   { businessId: '456', contributionPercent: 40, memberShare: 40.00, reserveAmount: 2.00, immediatePayout: 38.00, reserveReleaseDate: Date }
 * // ]
 */
function calculateMemberDistribution(poolCreatorShare, members) {
  // Validate inputs
  if (typeof poolCreatorShare !== 'number' || poolCreatorShare < 0) {
    throw new Error('Pool creator share must be a non-negative number');
  }
  
  // Validate member contributions
  validateMemberContributions(members);
  
  // Calculate distribution for each member
  const distributions = members.map(member => {
    // Calculate member's share based on contribution percentage
    const memberShare = (poolCreatorShare * member.contributionPercent) / 100;
    
    // Round to 2 decimal places
    const roundedMemberShare = Math.round(memberShare * 100) / 100;
    
    // Calculate chargeback reserve for this member
    const reserve = calculateChargebackReserve(roundedMemberShare);
    
    return {
      businessId: member.businessId,
      contributionPercent: member.contributionPercent,
      memberShare: roundedMemberShare,
      reserveAmount: reserve.reserveAmount,
      immediatePayout: reserve.immediatePayout,
      reserveReleaseDate: reserve.reserveReleaseDate
    };
  });
  
  return distributions;
}

/**
 * Group transactions by pool (collection)
 * 
 * Groups transactions by their collectionId metadata and calculates totals per pool.
 * Useful for aggregating pool earnings and generating pool reports.
 * 
 * @param {Array<object>} transactions - Array of transaction objects with metadata.collectionId
 * @returns {object} Grouped object where keys are collectionId and values are pool summary objects with:
 *   - collectionId: The collection/pool ID
 *   - transactionCount: Number of transactions in this pool
 *   - totalGrossAmount: Sum of all gross amounts
 *   - totalStripeFee: Sum of all Stripe fees
 *   - totalNetAmount: Sum of all net amounts
 *   - totalCreatorShare: Sum of all creator shares
 *   - totalPlatformShare: Sum of all platform shares
 *   - transactions: Array of transaction IDs in this pool
 * @throws {Error} If transactions is not an array
 * 
 * @example
 * const transactions = [
 *   { _id: '1', grossAmount: 100, creatorShare: 82.28, metadata: { collectionId: 'pool1' } },
 *   { _id: '2', grossAmount: 200, creatorShare: 164.56, metadata: { collectionId: 'pool1' } },
 *   { _id: '3', grossAmount: 50, creatorShare: 41.14, metadata: { collectionId: 'pool2' } }
 * ];
 * const grouped = groupTransactionsByPool(transactions);
 * // Returns: {
 * //   pool1: { collectionId: 'pool1', transactionCount: 2, totalGrossAmount: 300, totalCreatorShare: 246.84, ... },
 * //   pool2: { collectionId: 'pool2', transactionCount: 1, totalGrossAmount: 50, totalCreatorShare: 41.14, ... }
 * // }
 */
function groupTransactionsByPool(transactions) {
  // Validate input
  if (!Array.isArray(transactions)) {
    throw new Error('Transactions must be an array');
  }
  
  // Group transactions by collectionId
  const poolGroups = {};
  
  transactions.forEach(transaction => {
    // Skip transactions without collectionId
    if (!transaction.metadata || !transaction.metadata.collectionId) {
      return;
    }
    
    const collectionId = transaction.metadata.collectionId;
    
    // Initialize pool group if it doesn't exist
    if (!poolGroups[collectionId]) {
      poolGroups[collectionId] = {
        collectionId,
        transactionCount: 0,
        totalGrossAmount: 0,
        totalStripeFee: 0,
        totalNetAmount: 0,
        totalCreatorShare: 0,
        totalPlatformShare: 0,
        transactions: []
      };
    }
    
    // Add transaction data to pool group
    const pool = poolGroups[collectionId];
    pool.transactionCount += 1;
    pool.totalGrossAmount += transaction.grossAmount || 0;
    pool.totalStripeFee += transaction.stripeFee || 0;
    pool.totalNetAmount += transaction.netAmount || 0;
    pool.totalCreatorShare += transaction.creatorShare || 0;
    pool.totalPlatformShare += transaction.platformShare || 0;
    
    // Add transaction ID if available
    if (transaction._id) {
      pool.transactions.push(transaction._id);
    }
  });
  
  // Round all amounts to 2 decimal places
  Object.keys(poolGroups).forEach(collectionId => {
    const pool = poolGroups[collectionId];
    pool.totalGrossAmount = Math.round(pool.totalGrossAmount * 100) / 100;
    pool.totalStripeFee = Math.round(pool.totalStripeFee * 100) / 100;
    pool.totalNetAmount = Math.round(pool.totalNetAmount * 100) / 100;
    pool.totalCreatorShare = Math.round(pool.totalCreatorShare * 100) / 100;
    pool.totalPlatformShare = Math.round(pool.totalPlatformShare * 100) / 100;
  });
  
  return poolGroups;
}

module.exports = {
  calculatePoolBaseRevenue,
  validateMemberContributions,
  calculateMemberDistribution,
  groupTransactionsByPool
};

