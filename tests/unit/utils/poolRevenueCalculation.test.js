/**
 * Pool Revenue Calculation Utilities Tests
 * 
 * Comprehensive test suite for pool revenue calculation utilities:
 * - calculatePoolBaseRevenue()
 * - validateMemberContributions()
 * - calculateMemberDistribution()
 * - groupTransactionsByPool()
 * 
 * All tests use mock data - no external dependencies required
 */

const {
  calculatePoolBaseRevenue,
  validateMemberContributions,
  calculateMemberDistribution,
  groupTransactionsByPool
} = require('../../../src/utils/poolRevenueCalculation');
const { TIER_CONFIG } = require('../../../src/config/tiers');

describe('Pool Revenue Calculation Utilities', () => {
  // ===== calculatePoolBaseRevenue Tests =====
  
  describe('calculatePoolBaseRevenue()', () => {
    test('should calculate base revenue for free tier', () => {
      const result = calculatePoolBaseRevenue(100.00, TIER_CONFIG.free);
      
      expect(result).toBeDefined();
      expect(result.grossAmount).toBe(100.00);
      expect(result.stripeFee).toBeGreaterThan(0);
      expect(result.netAmount).toBeGreaterThan(0);
      expect(result.creatorShare).toBeGreaterThan(0);
      expect(result.platformShare).toBeGreaterThan(0);
      expect(result.creatorShare + result.platformShare).toBeCloseTo(result.netAmount, 2);
    });

    test('should calculate base revenue for contributor tier', () => {
      const result = calculatePoolBaseRevenue(100.00, TIER_CONFIG.contributor);
      
      expect(result).toBeDefined();
      expect(result.grossAmount).toBe(100.00);
      expect(result.creatorShare).toBeCloseTo(82.28, 2); // 85% of 96.80
      expect(result.platformShare).toBeCloseTo(14.52, 2); // 15% of 96.80
    });

    test('should calculate base revenue for partner tier', () => {
      const result = calculatePoolBaseRevenue(100.00, TIER_CONFIG.partner);
      
      expect(result).toBeDefined();
      expect(result.grossAmount).toBe(100.00);
      expect(result.creatorShare).toBeCloseTo(87.12, 2); // 90% of 96.80
      expect(result.platformShare).toBeCloseTo(9.68, 2); // 10% of 96.80
    });

    test('should calculate base revenue for equityPartner tier', () => {
      const result = calculatePoolBaseRevenue(100.00, TIER_CONFIG.equityPartner);
      
      expect(result).toBeDefined();
      expect(result.grossAmount).toBe(100.00);
      expect(result.creatorShare).toBeCloseTo(91.96, 2); // 95% of 96.80
      expect(result.platformShare).toBeCloseTo(4.84, 2); // 5% of 96.80
    });

    test('should calculate base revenue for various amounts', () => {
      const amounts = [10.00, 50.00, 100.00, 500.00, 1000.00];
      
      amounts.forEach(amount => {
        const result = calculatePoolBaseRevenue(amount, TIER_CONFIG.contributor);
        
        expect(result.grossAmount).toBe(amount);
        expect(result.creatorShare + result.platformShare).toBeCloseTo(result.netAmount, 2);
        expect(result.netAmount).toBeCloseTo(result.grossAmount - result.stripeFee, 2);
      });
    });

    test('should throw error for negative gross amount', () => {
      expect(() => {
        calculatePoolBaseRevenue(-100, TIER_CONFIG.free);
      }).toThrow('Gross amount must be a non-negative number');
    });

    test('should throw error for invalid tier config', () => {
      expect(() => {
        calculatePoolBaseRevenue(100, {});
      }).toThrow('Tier config must have revenueSplit property');
    });

    test('should throw error for null tier config', () => {
      expect(() => {
        calculatePoolBaseRevenue(100, null);
      }).toThrow('Tier config must have revenueSplit property');
    });
  });

  // ===== validateMemberContributions Tests =====
  
  describe('validateMemberContributions()', () => {
    test('should validate contributions totaling exactly 100%', () => {
      const members = [
        { businessId: '123', contributionPercent: 50 },
        { businessId: '456', contributionPercent: 50 }
      ];
      
      const result = validateMemberContributions(members);
      expect(result).toBe(true);
    });

    test('should validate contributions with 3 members totaling 100%', () => {
      const members = [
        { businessId: '123', contributionPercent: 40 },
        { businessId: '456', contributionPercent: 35 },
        { businessId: '789', contributionPercent: 25 }
      ];
      
      const result = validateMemberContributions(members);
      expect(result).toBe(true);
    });

    test('should validate contributions with 4 members totaling 100%', () => {
      const members = [
        { businessId: '123', contributionPercent: 30 },
        { businessId: '456', contributionPercent: 30 },
        { businessId: '789', contributionPercent: 25 },
        { businessId: '012', contributionPercent: 15 }
      ];
      
      const result = validateMemberContributions(members);
      expect(result).toBe(true);
    });

    test('should throw error for contributions not totaling 100%', () => {
      const members = [
        { businessId: '123', contributionPercent: 50 },
        { businessId: '456', contributionPercent: 40 }
      ];
      
      expect(() => {
        validateMemberContributions(members);
      }).toThrow('Member contributions must sum to 100%');
    });

    test('should throw error for contributions totaling 99.9%', () => {
      const members = [
        { businessId: '123', contributionPercent: 50 },
        { businessId: '456', contributionPercent: 49.9 }
      ];
      
      expect(() => {
        validateMemberContributions(members);
      }).toThrow('Member contributions must sum to 100%');
    });

    test('should throw error for contributions totaling 100.1%', () => {
      const members = [
        { businessId: '123', contributionPercent: 50 },
        { businessId: '456', contributionPercent: 50.1 }
      ];
      
      expect(() => {
        validateMemberContributions(members);
      }).toThrow('Member contributions must sum to 100%');
    });

    test('should throw error for empty members array', () => {
      expect(() => {
        validateMemberContributions([]);
      }).toThrow('Members must be a non-empty array');
    });

    test('should throw error for non-array input', () => {
      expect(() => {
        validateMemberContributions(null);
      }).toThrow('Members must be a non-empty array');
    });

    test('should throw error for member missing businessId', () => {
      const members = [
        { contributionPercent: 50 },
        { businessId: '456', contributionPercent: 50 }
      ];
      
      expect(() => {
        validateMemberContributions(members);
      }).toThrow('missing businessId');
    });

    test('should throw error for member missing contributionPercent', () => {
      const members = [
        { businessId: '123', contributionPercent: 50 },
        { businessId: '456' }
      ];
      
      expect(() => {
        validateMemberContributions(members);
      }).toThrow('contributionPercent must be a number');
    });

    test('should throw error for contributionPercent > 100', () => {
      const members = [
        { businessId: '123', contributionPercent: 101 },
        { businessId: '456', contributionPercent: -1 }
      ];
      
      expect(() => {
        validateMemberContributions(members);
      }).toThrow('contributionPercent must be between 0 and 100');
    });

    test('should throw error for contributionPercent < 0', () => {
      const members = [
        { businessId: '123', contributionPercent: 50 },
        { businessId: '456', contributionPercent: -10 }
      ];
      
      expect(() => {
        validateMemberContributions(members);
      }).toThrow('contributionPercent must be between 0 and 100');
    });
  });

  // ===== calculateMemberDistribution Tests =====
  
  describe('calculateMemberDistribution()', () => {
    test('should calculate 2-member split (50/50)', () => {
      const members = [
        { businessId: '123', contributionPercent: 50 },
        { businessId: '456', contributionPercent: 50 }
      ];
      
      const distributions = calculateMemberDistribution(100.00, members);
      
      expect(distributions).toHaveLength(2);
      expect(distributions[0].businessId).toBe('123');
      expect(distributions[0].contributionPercent).toBe(50);
      expect(distributions[0].memberShare).toBe(50.00);
      expect(distributions[1].businessId).toBe('456');
      expect(distributions[1].contributionPercent).toBe(50);
      expect(distributions[1].memberShare).toBe(50.00);
      
      // Verify totals equal pool creator share
      const totalShares = distributions.reduce((sum, d) => sum + d.memberShare, 0);
      expect(totalShares).toBeCloseTo(100.00, 2);
    });

    test('should calculate 3-member split (40/35/25)', () => {
      const members = [
        { businessId: '123', contributionPercent: 40 },
        { businessId: '456', contributionPercent: 35 },
        { businessId: '789', contributionPercent: 25 }
      ];
      
      const distributions = calculateMemberDistribution(100.00, members);
      
      expect(distributions).toHaveLength(3);
      expect(distributions[0].memberShare).toBe(40.00);
      expect(distributions[1].memberShare).toBe(35.00);
      expect(distributions[2].memberShare).toBe(25.00);
      
      // Verify totals equal pool creator share
      const totalShares = distributions.reduce((sum, d) => sum + d.memberShare, 0);
      expect(totalShares).toBeCloseTo(100.00, 2);
    });

    test('should calculate uneven split (60/30/10)', () => {
      const members = [
        { businessId: '123', contributionPercent: 60 },
        { businessId: '456', contributionPercent: 30 },
        { businessId: '789', contributionPercent: 10 }
      ];
      
      const distributions = calculateMemberDistribution(100.00, members);
      
      expect(distributions).toHaveLength(3);
      expect(distributions[0].memberShare).toBe(60.00);
      expect(distributions[1].memberShare).toBe(30.00);
      expect(distributions[2].memberShare).toBe(10.00);
      
      // Verify totals equal pool creator share
      const totalShares = distributions.reduce((sum, d) => sum + d.memberShare, 0);
      expect(totalShares).toBeCloseTo(100.00, 2);
    });

    test('should calculate reserves correctly (5% of each member share)', () => {
      const members = [
        { businessId: '123', contributionPercent: 50 },
        { businessId: '456', contributionPercent: 50 }
      ];
      
      const distributions = calculateMemberDistribution(100.00, members);
      
      distributions.forEach(distribution => {
        // Reserve should be 5% of member share
        const expectedReserve = distribution.memberShare * 0.05;
        expect(distribution.reserveAmount).toBeCloseTo(expectedReserve, 2);
        
        // Immediate payout should be 95% of member share
        const expectedPayout = distribution.memberShare * 0.95;
        expect(distribution.immediatePayout).toBeCloseTo(expectedPayout, 2);
        
        // Reserve release date should be 90 days from now
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + 90);
        expect(distribution.reserveReleaseDate).toBeInstanceOf(Date);
        expect(distribution.reserveReleaseDate.getTime()).toBeCloseTo(expectedDate.getTime(), -5); // Within 5 seconds
      });
    });

    test('should include all required fields in distribution', () => {
      const members = [
        { businessId: '123', contributionPercent: 100 }
      ];
      
      const distributions = calculateMemberDistribution(100.00, members);
      
      expect(distributions[0]).toHaveProperty('businessId');
      expect(distributions[0]).toHaveProperty('contributionPercent');
      expect(distributions[0]).toHaveProperty('memberShare');
      expect(distributions[0]).toHaveProperty('reserveAmount');
      expect(distributions[0]).toHaveProperty('immediatePayout');
      expect(distributions[0]).toHaveProperty('reserveReleaseDate');
    });

    test('should throw error for invalid pool creator share', () => {
      const members = [
        { businessId: '123', contributionPercent: 100 }
      ];
      
      expect(() => {
        calculateMemberDistribution(-100, members);
      }).toThrow('Pool creator share must be a non-negative number');
    });

    test('should throw error for invalid member contributions', () => {
      const members = [
        { businessId: '123', contributionPercent: 50 },
        { businessId: '456', contributionPercent: 40 }
      ];
      
      expect(() => {
        calculateMemberDistribution(100.00, members);
      }).toThrow('Member contributions must sum to 100%');
    });

    test('should handle decimal member shares correctly', () => {
      const members = [
        { businessId: '123', contributionPercent: 33.33 },
        { businessId: '456', contributionPercent: 33.33 },
        { businessId: '789', contributionPercent: 33.34 }
      ];
      
      const distributions = calculateMemberDistribution(100.00, members);
      
      expect(distributions).toHaveLength(3);
      const totalShares = distributions.reduce((sum, d) => sum + d.memberShare, 0);
      expect(totalShares).toBeCloseTo(100.00, 2);
    });
  });

  // ===== groupTransactionsByPool Tests =====
  
  describe('groupTransactionsByPool()', () => {
    test('should group transactions by collectionId', () => {
      const transactions = [
        { _id: '1', grossAmount: 100, creatorShare: 82.28, metadata: { collectionId: 'pool1' } },
        { _id: '2', grossAmount: 200, creatorShare: 164.56, metadata: { collectionId: 'pool1' } },
        { _id: '3', grossAmount: 50, creatorShare: 41.14, metadata: { collectionId: 'pool2' } }
      ];
      
      const grouped = groupTransactionsByPool(transactions);
      
      expect(grouped).toHaveProperty('pool1');
      expect(grouped).toHaveProperty('pool2');
      expect(grouped.pool1.transactionCount).toBe(2);
      expect(grouped.pool2.transactionCount).toBe(1);
    });

    test('should calculate totals per pool correctly', () => {
      const transactions = [
        { 
          _id: '1', 
          grossAmount: 100, 
          stripeFee: 3.20,
          netAmount: 96.80,
          creatorShare: 82.28, 
          platformShare: 14.52,
          metadata: { collectionId: 'pool1' } 
        },
        { 
          _id: '2', 
          grossAmount: 200, 
          stripeFee: 6.10,
          netAmount: 193.90,
          creatorShare: 164.56, 
          platformShare: 29.08,
          metadata: { collectionId: 'pool1' } 
        },
        { 
          _id: '3', 
          grossAmount: 50, 
          stripeFee: 1.75,
          netAmount: 48.25,
          creatorShare: 41.14, 
          platformShare: 7.24,
          metadata: { collectionId: 'pool2' } 
        }
      ];
      
      const grouped = groupTransactionsByPool(transactions);
      
      // Pool1 totals
      expect(grouped.pool1.totalGrossAmount).toBe(300.00);
      expect(grouped.pool1.totalStripeFee).toBeCloseTo(9.30, 2);
      expect(grouped.pool1.totalNetAmount).toBeCloseTo(290.70, 2);
      expect(grouped.pool1.totalCreatorShare).toBeCloseTo(246.84, 2);
      expect(grouped.pool1.totalPlatformShare).toBeCloseTo(43.60, 2);
      
      // Pool2 totals
      expect(grouped.pool2.totalGrossAmount).toBe(50.00);
      expect(grouped.pool2.totalStripeFee).toBe(1.75);
      expect(grouped.pool2.totalNetAmount).toBe(48.25);
      expect(grouped.pool2.totalCreatorShare).toBe(41.14);
      expect(grouped.pool2.totalPlatformShare).toBe(7.24);
    });

    test('should include transaction IDs in pool', () => {
      const transactions = [
        { _id: '1', grossAmount: 100, metadata: { collectionId: 'pool1' } },
        { _id: '2', grossAmount: 200, metadata: { collectionId: 'pool1' } }
      ];
      
      const grouped = groupTransactionsByPool(transactions);
      
      expect(grouped.pool1.transactions).toContain('1');
      expect(grouped.pool1.transactions).toContain('2');
      expect(grouped.pool1.transactions).toHaveLength(2);
    });

    test('should skip transactions without collectionId', () => {
      const transactions = [
        { _id: '1', grossAmount: 100, metadata: { collectionId: 'pool1' } },
        { _id: '2', grossAmount: 200 }, // No collectionId
        { _id: '3', grossAmount: 50, metadata: {} } // Empty metadata
      ];
      
      const grouped = groupTransactionsByPool(transactions);
      
      expect(grouped).toHaveProperty('pool1');
      expect(grouped.pool1.transactionCount).toBe(1);
      expect(Object.keys(grouped)).toHaveLength(1);
    });

    test('should handle empty transactions array', () => {
      const grouped = groupTransactionsByPool([]);
      
      expect(grouped).toEqual({});
    });

    test('should handle transactions with missing amounts gracefully', () => {
      const transactions = [
        { _id: '1', grossAmount: 100, metadata: { collectionId: 'pool1' } },
        { _id: '2', metadata: { collectionId: 'pool1' } } // Missing amounts
      ];
      
      const grouped = groupTransactionsByPool(transactions);
      
      expect(grouped.pool1.transactionCount).toBe(2);
      expect(grouped.pool1.totalGrossAmount).toBe(100.00);
    });

    test('should round amounts to 2 decimal places', () => {
      const transactions = [
        { 
          _id: '1', 
          grossAmount: 100.123, 
          creatorShare: 82.28456,
          metadata: { collectionId: 'pool1' } 
        }
      ];
      
      const grouped = groupTransactionsByPool(transactions);
      
      expect(grouped.pool1.totalGrossAmount).toBe(100.12);
      expect(grouped.pool1.totalCreatorShare).toBe(82.28);
    });

    test('should throw error for non-array input', () => {
      expect(() => {
        groupTransactionsByPool(null);
      }).toThrow('Transactions must be an array');
    });

    test('should handle multiple pools correctly', () => {
      const transactions = [
        { _id: '1', grossAmount: 100, metadata: { collectionId: 'pool1' } },
        { _id: '2', grossAmount: 200, metadata: { collectionId: 'pool2' } },
        { _id: '3', grossAmount: 50, metadata: { collectionId: 'pool3' } },
        { _id: '4', grossAmount: 150, metadata: { collectionId: 'pool1' } }
      ];
      
      const grouped = groupTransactionsByPool(transactions);
      
      expect(Object.keys(grouped)).toHaveLength(3);
      expect(grouped.pool1.transactionCount).toBe(2);
      expect(grouped.pool2.transactionCount).toBe(1);
      expect(grouped.pool3.transactionCount).toBe(1);
    });
  });
});

