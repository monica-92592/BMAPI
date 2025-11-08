/**
 * Revenue Calculation Utilities Tests
 * 
 * Comprehensive test suite for revenue calculation functions covering:
 * - Stripe fee calculation
 * - Revenue split calculation (Option C)
 * - Chargeback reserve calculation
 * - Pool member share calculation
 * - Pool distribution calculation
 * - All tier splits comparison
 * 
 * All tests use mock data - no external dependencies required
 */

const {
  calculateStripeFee,
  calculateRevenueSplit,
  calculateChargebackReserve,
  calculatePoolMemberShare,
  calculatePoolDistribution,
  calculateAllTierSplits
} = require('../../../src/utils/revenueCalculation');
const { TIER_CONFIG } = require('../../../src/config/tiers');

describe('Revenue Calculation Utilities', () => {
  
  // ===== calculateStripeFee() Tests =====
  
  describe('calculateStripeFee()', () => {
    test('should calculate Stripe fee for $100', () => {
      const fee = calculateStripeFee(100.00);
      const expected = (100.00 * 0.029) + 0.30;
      expect(fee).toBeCloseTo(expected, 2);
      expect(fee).toBe(3.20);
    });

    test('should calculate Stripe fee for $50', () => {
      const fee = calculateStripeFee(50.00);
      const expected = (50.00 * 0.029) + 0.30;
      expect(fee).toBeCloseTo(expected, 2);
      expect(fee).toBe(1.75);
    });

    test('should calculate Stripe fee for $10', () => {
      const fee = calculateStripeFee(10.00);
      const expected = (10.00 * 0.029) + 0.30;
      expect(fee).toBeCloseTo(expected, 2);
      expect(fee).toBe(0.59);
    });

    test('should calculate Stripe fee for $1000', () => {
      const fee = calculateStripeFee(1000.00);
      const expected = (1000.00 * 0.029) + 0.30;
      expect(fee).toBeCloseTo(expected, 2);
      expect(fee).toBe(29.30);
    });

    test('should return $0.30 for $0 amount', () => {
      const fee = calculateStripeFee(0.00);
      expect(fee).toBe(0.30);
    });

    test('should throw error for negative amount', () => {
      expect(() => calculateStripeFee(-10.00)).toThrow('Gross amount cannot be negative');
    });

    test('should throw error for invalid input (string)', () => {
      expect(() => calculateStripeFee('100')).toThrow('Gross amount must be a valid number');
    });

    test('should throw error for invalid input (NaN)', () => {
      expect(() => calculateStripeFee(NaN)).toThrow('Gross amount must be a valid number');
    });

    test('should round to 2 decimal places', () => {
      const fee = calculateStripeFee(33.33);
      const decimals = (fee.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    });

    test('should handle small amounts correctly', () => {
      const fee = calculateStripeFee(1.00);
      const expected = (1.00 * 0.029) + 0.30;
      expect(fee).toBeCloseTo(expected, 2);
    });

    test('should handle large amounts correctly', () => {
      const fee = calculateStripeFee(100000.00);
      const expected = (100000.00 * 0.029) + 0.30;
      expect(fee).toBeCloseTo(expected, 2);
    });
  });

  // ===== calculateRevenueSplit() Tests =====
  
  describe('calculateRevenueSplit()', () => {
    describe('Free Tier (80/20 split)', () => {
      test('should calculate split for $100', () => {
        const split = calculateRevenueSplit(100.00, TIER_CONFIG.free);
        
        expect(split.grossAmount).toBe(100.00);
        expect(split.stripeFee).toBe(3.20);
        expect(split.netAmount).toBe(96.80);
        expect(split.creatorShare).toBeCloseTo(77.44, 2);
        expect(split.platformShare).toBeCloseTo(19.36, 2);
        expect(split.creatorShare + split.platformShare).toBeCloseTo(split.netAmount, 2);
      });

      test('should calculate split for $10', () => {
        const split = calculateRevenueSplit(10.00, TIER_CONFIG.free);
        
        expect(split.grossAmount).toBe(10.00);
        expect(split.stripeFee).toBe(0.59);
        expect(split.netAmount).toBe(9.41);
        expect(split.creatorShare + split.platformShare).toBeCloseTo(split.netAmount, 2);
      });

      test('should calculate split for $1000', () => {
        const split = calculateRevenueSplit(1000.00, TIER_CONFIG.free);
        
        expect(split.grossAmount).toBe(1000.00);
        expect(split.stripeFee).toBe(29.30);
        expect(split.netAmount).toBe(970.70);
        expect(split.creatorShare + split.platformShare).toBeCloseTo(split.netAmount, 2);
      });
    });

    describe('Contributor Tier (85/15 split)', () => {
      test('should calculate split for $100', () => {
        const split = calculateRevenueSplit(100.00, TIER_CONFIG.contributor);
        
        expect(split.grossAmount).toBe(100.00);
        expect(split.stripeFee).toBe(3.20);
        expect(split.netAmount).toBe(96.80);
        expect(split.creatorShare).toBeCloseTo(82.28, 2);
        expect(split.platformShare).toBeCloseTo(14.52, 2);
        expect(split.creatorShare + split.platformShare).toBeCloseTo(split.netAmount, 2);
      });
    });

    describe('Partner Tier (90/10 split)', () => {
      test('should calculate split for $100', () => {
        const split = calculateRevenueSplit(100.00, TIER_CONFIG.partner);
        
        expect(split.grossAmount).toBe(100.00);
        expect(split.stripeFee).toBe(3.20);
        expect(split.netAmount).toBe(96.80);
        expect(split.creatorShare).toBeCloseTo(87.12, 2);
        expect(split.platformShare).toBeCloseTo(9.68, 2);
        expect(split.creatorShare + split.platformShare).toBeCloseTo(split.netAmount, 2);
      });
    });

    describe('Equity Partner Tier (95/5 split)', () => {
      test('should calculate split for $100', () => {
        const split = calculateRevenueSplit(100.00, TIER_CONFIG.equityPartner);
        
        expect(split.grossAmount).toBe(100.00);
        expect(split.stripeFee).toBe(3.20);
        expect(split.netAmount).toBe(96.80);
        expect(split.creatorShare).toBeCloseTo(91.96, 2);
        expect(split.platformShare).toBeCloseTo(4.84, 2);
        expect(split.creatorShare + split.platformShare).toBeCloseTo(split.netAmount, 2);
      });
    });

    describe('Error Handling', () => {
      test('should throw error for negative amount', () => {
        expect(() => calculateRevenueSplit(-10.00, TIER_CONFIG.free))
          .toThrow('Gross amount cannot be negative');
      });

      test('should throw error for invalid tier config (null)', () => {
        expect(() => calculateRevenueSplit(100.00, null))
          .toThrow('Tier config must be an object');
      });

      test('should throw error for invalid tier config (missing revenueSplit)', () => {
        expect(() => calculateRevenueSplit(100.00, {}))
          .toThrow('Tier config must have revenueSplit property');
      });

      test('should throw error for percentages not totaling 100', () => {
        const invalidConfig = {
          revenueSplit: { creator: 80, platform: 15 }
        };
        expect(() => calculateRevenueSplit(100.00, invalidConfig))
          .toThrow('Revenue split must total 100%, got 95%');
      });

      test('should throw error for invalid percentages (non-numbers)', () => {
        const invalidConfig = {
          revenueSplit: { creator: '80', platform: '20' }
        };
        expect(() => calculateRevenueSplit(100.00, invalidConfig))
          .toThrow('Revenue split percentages must be numbers');
      });

      test('should throw error for invalid input (string)', () => {
        expect(() => calculateRevenueSplit('100', TIER_CONFIG.free))
          .toThrow('Gross amount must be a valid number');
      });
    });

    describe('Amount Validation', () => {
      test('should verify creator + platform = net amount', () => {
        const split = calculateRevenueSplit(100.00, TIER_CONFIG.free);
        const total = split.creatorShare + split.platformShare;
        expect(total).toBeCloseTo(split.netAmount, 2);
      });

      test('should round all amounts to 2 decimals', () => {
        const split = calculateRevenueSplit(33.33, TIER_CONFIG.free);
        
        const grossDecimals = (split.grossAmount.toString().split('.')[1] || '').length;
        const feeDecimals = (split.stripeFee.toString().split('.')[1] || '').length;
        const netDecimals = (split.netAmount.toString().split('.')[1] || '').length;
        const creatorDecimals = (split.creatorShare.toString().split('.')[1] || '').length;
        const platformDecimals = (split.platformShare.toString().split('.')[1] || '').length;
        
        expect(grossDecimals).toBeLessThanOrEqual(2);
        expect(feeDecimals).toBeLessThanOrEqual(2);
        expect(netDecimals).toBeLessThanOrEqual(2);
        expect(creatorDecimals).toBeLessThanOrEqual(2);
        expect(platformDecimals).toBeLessThanOrEqual(2);
      });
    });
  });

  // ===== calculateChargebackReserve() Tests =====
  
  describe('calculateChargebackReserve()', () => {
    test('should calculate 5% reserve', () => {
      const reserve = calculateChargebackReserve(77.44);
      const expectedReserve = 77.44 * 0.05;
      expect(reserve.reserveAmount).toBeCloseTo(expectedReserve, 2);
      expect(reserve.reserveAmount).toBeCloseTo(3.87, 2);
    });

    test('should calculate 95% immediate payout', () => {
      const reserve = calculateChargebackReserve(77.44);
      const expectedPayout = 77.44 * 0.95;
      expect(reserve.immediatePayout).toBeCloseTo(expectedPayout, 2);
      expect(reserve.immediatePayout).toBeCloseTo(73.57, 2);
    });

    test('should verify reserve + payout = total share', () => {
      const reserve = calculateChargebackReserve(77.44);
      const total = reserve.reserveAmount + reserve.immediatePayout;
      expect(total).toBeCloseTo(reserve.totalCreatorShare, 2);
    });

    test('should set release date to 90 days future', () => {
      const reserve = calculateChargebackReserve(77.44);
      const now = new Date();
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 90);
      
      // Check that release date is approximately 90 days from now
      const daysDiff = (reserve.reserveReleaseDate - now) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeCloseTo(90, 0);
    });

    test('should throw error for negative amount', () => {
      expect(() => calculateChargebackReserve(-10.00))
        .toThrow('Creator share cannot be negative');
    });

    test('should throw error for invalid input (string)', () => {
      expect(() => calculateChargebackReserve('77.44'))
        .toThrow('Creator share must be a valid number');
    });

    test('should handle zero amount', () => {
      const reserve = calculateChargebackReserve(0.00);
      expect(reserve.reserveAmount).toBe(0.00);
      expect(reserve.immediatePayout).toBe(0.00);
    });

    test('should round amounts to 2 decimals', () => {
      const reserve = calculateChargebackReserve(77.44);
      
      const reserveDecimals = (reserve.reserveAmount.toString().split('.')[1] || '').length;
      const payoutDecimals = (reserve.immediatePayout.toString().split('.')[1] || '').length;
      
      expect(reserveDecimals).toBeLessThanOrEqual(2);
      expect(payoutDecimals).toBeLessThanOrEqual(2);
    });

    test('should handle large amounts correctly', () => {
      const reserve = calculateChargebackReserve(10000.00);
      expect(reserve.reserveAmount).toBe(500.00); // 5%
      expect(reserve.immediatePayout).toBe(9500.00); // 95%
    });
  });

  // ===== calculatePoolMemberShare() Tests =====
  
  describe('calculatePoolMemberShare()', () => {
    test('should calculate share for 50% contribution', () => {
      const share = calculatePoolMemberShare(77.44, 50);
      expect(share).toBe(38.72);
    });

    test('should calculate share for 25% contribution', () => {
      const share = calculatePoolMemberShare(77.44, 25);
      expect(share).toBe(19.36);
    });

    test('should calculate share for 75% contribution', () => {
      const share = calculatePoolMemberShare(77.44, 75);
      expect(share).toBe(58.08);
    });

    test('should handle 0% contribution', () => {
      const share = calculatePoolMemberShare(77.44, 0);
      expect(share).toBe(0.00);
    });

    test('should handle 100% contribution', () => {
      const share = calculatePoolMemberShare(77.44, 100);
      expect(share).toBe(77.44);
    });

    test('should throw error for contribution > 100', () => {
      expect(() => calculatePoolMemberShare(77.44, 150))
        .toThrow('Contribution percentage must be between 0 and 100');
    });

    test('should throw error for negative contribution', () => {
      expect(() => calculatePoolMemberShare(77.44, -10))
        .toThrow('Contribution percentage must be between 0 and 100');
    });

    test('should throw error for negative pool share', () => {
      expect(() => calculatePoolMemberShare(-10.00, 50))
        .toThrow('Total pool share cannot be negative');
    });

    test('should throw error for invalid input (string)', () => {
      expect(() => calculatePoolMemberShare('77.44', 50))
        .toThrow('Total pool share must be a valid number');
    });

    test('should round to 2 decimal places', () => {
      const share = calculatePoolMemberShare(33.33, 33.33);
      const decimals = (share.toString().split('.')[1] || '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  // ===== calculatePoolDistribution() Tests =====
  
  describe('calculatePoolDistribution()', () => {
    test('should calculate distribution for 3-member pool (40%, 35%, 25%)', () => {
      const members = [
        { businessId: '1', contributionPercent: 40 },
        { businessId: '2', contributionPercent: 35 },
        { businessId: '3', contributionPercent: 25 }
      ];

      const distribution = calculatePoolDistribution(100.00, TIER_CONFIG.free, members);

      expect(distribution.baseSplit.creatorShare).toBeCloseTo(77.44, 2);
      expect(distribution.memberDistributions).toHaveLength(3);
      
      // Member 1: 40% of 77.44 = 30.98
      expect(distribution.memberDistributions[0].totalShare).toBeCloseTo(30.98, 2);
      expect(distribution.memberDistributions[0].contributionPercent).toBe(40);
      
      // Member 2: 35% of 77.44 = 27.10
      expect(distribution.memberDistributions[1].totalShare).toBeCloseTo(27.10, 2);
      expect(distribution.memberDistributions[1].contributionPercent).toBe(35);
      
      // Member 3: 25% of 77.44 = 19.36
      expect(distribution.memberDistributions[2].totalShare).toBeCloseTo(19.36, 2);
      expect(distribution.memberDistributions[2].contributionPercent).toBe(25);

      // Verify total distributed equals creator share
      const totalDistributed = distribution.memberDistributions.reduce(
        (sum, member) => sum + member.totalShare,
        0
      );
      expect(totalDistributed).toBeCloseTo(distribution.baseSplit.creatorShare, 2);
    });

    test('should calculate distribution for 2-member pool (50/50)', () => {
      const members = [
        { businessId: '1', contributionPercent: 50 },
        { businessId: '2', contributionPercent: 50 }
      ];

      const distribution = calculatePoolDistribution(100.00, TIER_CONFIG.free, members);

      expect(distribution.baseSplit.creatorShare).toBeCloseTo(77.44, 2);
      expect(distribution.memberDistributions).toHaveLength(2);
      
      // Each member gets 50% = 38.72
      expect(distribution.memberDistributions[0].totalShare).toBeCloseTo(38.72, 2);
      expect(distribution.memberDistributions[1].totalShare).toBeCloseTo(38.72, 2);

      // Verify total distributed equals creator share
      const totalDistributed = distribution.memberDistributions.reduce(
        (sum, member) => sum + member.totalShare,
        0
      );
      expect(totalDistributed).toBeCloseTo(distribution.baseSplit.creatorShare, 2);
    });

    test('should verify reserves calculated for each member', () => {
      const members = [
        { businessId: '1', contributionPercent: 50 },
        { businessId: '2', contributionPercent: 50 }
      ];

      const distribution = calculatePoolDistribution(100.00, TIER_CONFIG.free, members);

      distribution.memberDistributions.forEach(member => {
        expect(member.reserveAmount).toBeGreaterThan(0);
        expect(member.immediatePayout).toBeGreaterThan(0);
        expect(member.reserveReleaseDate).toBeInstanceOf(Date);
        expect(member.reserveAmount + member.immediatePayout).toBeCloseTo(member.totalShare, 2);
      });
    });

    test('should throw error for contributions not totaling 100%', () => {
      const members = [
        { businessId: '1', contributionPercent: 50 },
        { businessId: '2', contributionPercent: 40 } // Total = 90%
      ];

      expect(() => calculatePoolDistribution(100.00, TIER_CONFIG.free, members))
        .toThrow('Member contributions must total 100%, got 90%');
    });

    test('should throw error for contributions totaling > 100%', () => {
      const members = [
        { businessId: '1', contributionPercent: 60 },
        { businessId: '2', contributionPercent: 50 } // Total = 110%
      ];

      expect(() => calculatePoolDistribution(100.00, TIER_CONFIG.free, members))
        .toThrow('Member contributions must total 100%, got 110%');
    });

    test('should throw error for empty members array', () => {
      expect(() => calculatePoolDistribution(100.00, TIER_CONFIG.free, []))
        .toThrow('Members must be a non-empty array');
    });

    test('should throw error for invalid member contribution (non-number)', () => {
      const members = [
        { businessId: '1', contributionPercent: '50' },
        { businessId: '2', contributionPercent: 50 }
      ];

      expect(() => calculatePoolDistribution(100.00, TIER_CONFIG.free, members))
        .toThrow('All members must have valid contribution percentages');
    });

    test('should throw error for negative gross amount', () => {
      const members = [
        { businessId: '1', contributionPercent: 50 },
        { businessId: '2', contributionPercent: 50 }
      ];

      expect(() => calculatePoolDistribution(-10.00, TIER_CONFIG.free, members))
        .toThrow('Gross amount must be a valid non-negative number');
    });

    test('should verify total distributions = pool total', () => {
      const members = [
        { businessId: '1', contributionPercent: 40 },
        { businessId: '2', contributionPercent: 35 },
        { businessId: '3', contributionPercent: 25 }
      ];

      const distribution = calculatePoolDistribution(100.00, TIER_CONFIG.free, members);
      const totalDistributed = distribution.memberDistributions.reduce(
        (sum, member) => sum + member.totalShare,
        0
      );

      expect(totalDistributed).toBeCloseTo(distribution.baseSplit.creatorShare, 2);
      expect(distribution.totalDistributed).toBeCloseTo(distribution.baseSplit.creatorShare, 2);
    });
  });

  // ===== calculateAllTierSplits() Tests =====
  
  describe('calculateAllTierSplits()', () => {
    test('should return all 4 tier calculations', () => {
      const allSplits = calculateAllTierSplits(100.00);

      expect(allSplits).toHaveProperty('free');
      expect(allSplits).toHaveProperty('contributor');
      expect(allSplits).toHaveProperty('partner');
      expect(allSplits).toHaveProperty('equityPartner');
    });

    test('should verify structure is correct for all tiers', () => {
      const allSplits = calculateAllTierSplits(100.00);

      Object.values(allSplits).forEach(split => {
        expect(split).toHaveProperty('grossAmount');
        expect(split).toHaveProperty('stripeFee');
        expect(split).toHaveProperty('netAmount');
        expect(split).toHaveProperty('creatorShare');
        expect(split).toHaveProperty('platformShare');
      });
    });

    test('should calculate splits correctly for $100', () => {
      const allSplits = calculateAllTierSplits(100.00);

      // Free tier: 80/20
      expect(allSplits.free.creatorShare).toBeCloseTo(77.44, 2);
      expect(allSplits.free.platformShare).toBeCloseTo(19.36, 2);

      // Contributor tier: 85/15
      expect(allSplits.contributor.creatorShare).toBeCloseTo(82.28, 2);
      expect(allSplits.contributor.platformShare).toBeCloseTo(14.52, 2);

      // Partner tier: 90/10
      expect(allSplits.partner.creatorShare).toBeCloseTo(87.12, 2);
      expect(allSplits.partner.platformShare).toBeCloseTo(9.68, 2);

      // Equity Partner tier: 95/5
      expect(allSplits.equityPartner.creatorShare).toBeCloseTo(91.96, 2);
      expect(allSplits.equityPartner.platformShare).toBeCloseTo(4.84, 2);
    });

    test('should calculate splits correctly for $10', () => {
      const allSplits = calculateAllTierSplits(10.00);

      // All tiers should have same gross, fee, and net
      expect(allSplits.free.grossAmount).toBe(10.00);
      expect(allSplits.free.stripeFee).toBe(0.59);
      expect(allSplits.free.netAmount).toBe(9.41);

      // Creator shares should increase with tier
      expect(allSplits.free.creatorShare).toBeLessThan(allSplits.contributor.creatorShare);
      expect(allSplits.contributor.creatorShare).toBeLessThan(allSplits.partner.creatorShare);
      expect(allSplits.partner.creatorShare).toBeLessThan(allSplits.equityPartner.creatorShare);
    });

    test('should calculate splits correctly for $1000', () => {
      const allSplits = calculateAllTierSplits(1000.00);

      // All tiers should have same gross, fee, and net
      expect(allSplits.free.grossAmount).toBe(1000.00);
      expect(allSplits.free.stripeFee).toBe(29.30);
      expect(allSplits.free.netAmount).toBe(970.70);

      // Creator shares should increase with tier
      expect(allSplits.free.creatorShare).toBeLessThan(allSplits.contributor.creatorShare);
      expect(allSplits.contributor.creatorShare).toBeLessThan(allSplits.partner.creatorShare);
      expect(allSplits.partner.creatorShare).toBeLessThan(allSplits.equityPartner.creatorShare);
    });

    test('should throw error for negative amount', () => {
      expect(() => calculateAllTierSplits(-10.00))
        .toThrow('Gross amount cannot be negative');
    });

    test('should throw error for invalid input (string)', () => {
      expect(() => calculateAllTierSplits('100'))
        .toThrow('Gross amount must be a valid number');
    });

    test('should verify creator shares increase with tier', () => {
      const allSplits = calculateAllTierSplits(100.00);

      expect(allSplits.free.creatorShare).toBeLessThan(allSplits.contributor.creatorShare);
      expect(allSplits.contributor.creatorShare).toBeLessThan(allSplits.partner.creatorShare);
      expect(allSplits.partner.creatorShare).toBeLessThan(allSplits.equityPartner.creatorShare);
    });

    test('should verify platform shares decrease with tier', () => {
      const allSplits = calculateAllTierSplits(100.00);

      expect(allSplits.free.platformShare).toBeGreaterThan(allSplits.contributor.platformShare);
      expect(allSplits.contributor.platformShare).toBeGreaterThan(allSplits.partner.platformShare);
      expect(allSplits.partner.platformShare).toBeGreaterThan(allSplits.equityPartner.platformShare);
    });
  });
});

