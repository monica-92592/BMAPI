/**
 * Revenue Split Integration Tests
 * 
 * Comprehensive test suite for revenue split calculations and payment flows:
 * - Complete license payment flow
 * - All tier revenue splits (free, contributor, partner, equityPartner)
 * - Chargeback reserve calculations
 * - Pool revenue distribution
 * 
 * All tests use mock Stripe data (no real API calls)
 */

const Transaction = require('../../src/models/Transaction');
const Business = require('../../src/models/Business');
const License = require('../../src/models/License');
const Collection = require('../../src/models/Collection');
const {
  calculateStripeFee,
  calculateRevenueSplit,
  calculateChargebackReserve,
  calculatePoolDistribution
} = require('../../src/utils/revenueCalculation');
const {
  calculatePoolBaseRevenue,
  calculateMemberDistribution
} = require('../../src/utils/poolRevenueCalculation');
const { TIER_CONFIG } = require('../../src/config/tiers');
const {
  createMockPaymentIntent,
  createMockCustomer
} = require('../helpers/stripeMocks');
const mongoose = require('mongoose');

describe('Revenue Split Integration Tests', () => {
  let testBusiness1, testBusiness2, testBusiness3; // Creator, buyer, pool member
  let testLicense;
  let testCollection;

  // Set up test environment
  beforeAll(async () => {
    // Create test businesses with different tiers
    testBusiness1 = await Business.create({
      email: `revenue-test-creator-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Revenue Test Creator',
      companyName: 'Creator Company',
      companyType: 'photography',
      industry: 'media',
      membershipTier: 'free', // Will be changed in tests
      subscriptionStatus: 'active',
      revenueBalance: 0
    });

    testBusiness2 = await Business.create({
      email: `revenue-test-buyer-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Revenue Test Buyer',
      companyName: 'Buyer Company',
      companyType: 'design',
      industry: 'media',
      membershipTier: 'free',
      subscriptionStatus: 'active',
      revenueBalance: 0
    });

    testBusiness3 = await Business.create({
      email: `revenue-test-member-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Revenue Test Member',
      companyName: 'Member Company',
      companyType: 'photography',
      industry: 'media',
      membershipTier: 'free',
      subscriptionStatus: 'active',
      revenueBalance: 0
    });

    // Create test license
    testLicense = await License.create({
      licensorId: testBusiness1._id,
      licenseeId: testBusiness2._id,
      mediaId: new mongoose.Types.ObjectId(),
      licenseType: 'commercial',
      price: 100.00,
      status: 'pending'
    });
  });

  // Clean up after all tests
  afterAll(async () => {
    await Transaction.deleteMany({});
    await License.deleteMany({});
    await Collection.deleteMany({});
    await Business.deleteMany({});
  });

  describe('Complete License Payment Flow', () => {
    test('should create transaction, calculate split, and mark completed', async () => {
      const grossAmount = 100.00;
      
      // Create mock payment intent
      const mockPaymentIntent = createMockPaymentIntent({
        amount: Math.round(grossAmount * 100), // Stripe uses cents
        status: 'succeeded'
      });

      // Calculate revenue split
      const tierConfig = TIER_CONFIG.free;
      const revenueSplit = calculateRevenueSplit(grossAmount, tierConfig);

      // Create transaction
      const transaction = new Transaction({
        type: 'license_payment',
        grossAmount: grossAmount,
        stripeFee: revenueSplit.stripeFee,
        netAmount: revenueSplit.netAmount,
        creatorShare: revenueSplit.creatorShare,
        platformShare: revenueSplit.platformShare,
        status: 'pending',
        stripePaymentIntentId: mockPaymentIntent.id,
        payer: testBusiness2._id,
        payee: testBusiness1._id,
        relatedLicense: testLicense._id,
        description: 'Test license payment'
      });

      // Verify amounts
      expect(transaction.grossAmount).toBe(grossAmount);
      expect(transaction.stripeFee).toBeCloseTo(3.20, 2); // $100 * 0.029 + $0.30
      expect(transaction.netAmount).toBeCloseTo(96.80, 2); // $100 - $3.20
      expect(transaction.creatorShare).toBeCloseTo(77.44, 2); // 80% of $96.80
      expect(transaction.platformShare).toBeCloseTo(19.36, 2); // 20% of $96.80

      // Verify creator + platform = net
      expect(transaction.creatorShare + transaction.platformShare).toBeCloseTo(
        transaction.netAmount,
        2
      );

      // Save transaction
      await transaction.save();

      // Mark as completed
      transaction.markCompleted();
      await transaction.save();

      // Verify status
      expect(transaction.status).toBe('completed');
      expect(transaction.completedAt).toBeDefined();

      // Verify transaction saved
      const savedTransaction = await Transaction.findById(transaction._id);
      expect(savedTransaction).toBeDefined();
      expect(savedTransaction.status).toBe('completed');
    });
  });

  describe('All Tier Revenue Splits', () => {
    const testAmount = 100.00;
    const tiers = ['free', 'contributor', 'partner', 'equityPartner'];

    tiers.forEach(tier => {
      test(`should calculate correct split for ${tier} tier`, async () => {
        // Update business tier
        await Business.findByIdAndUpdate(testBusiness1._id, { membershipTier: tier });

        // Get tier config
        const tierConfig = TIER_CONFIG[tier];
        const expectedSplit = tierConfig.revenueSplit;

        // Calculate revenue split
        const revenueSplit = calculateRevenueSplit(testAmount, tierConfig);

        // Verify Stripe fee
        const expectedStripeFee = calculateStripeFee(testAmount);
        expect(revenueSplit.stripeFee).toBeCloseTo(expectedStripeFee, 2);

        // Verify net amount
        const expectedNetAmount = testAmount - revenueSplit.stripeFee;
        expect(revenueSplit.netAmount).toBeCloseTo(expectedNetAmount, 2);

        // Verify creator share
        const expectedCreatorShare = revenueSplit.netAmount * (expectedSplit.creator / 100);
        expect(revenueSplit.creatorShare).toBeCloseTo(expectedCreatorShare, 2);

        // Verify platform share
        const expectedPlatformShare = revenueSplit.netAmount * (expectedSplit.platform / 100);
        expect(revenueSplit.platformShare).toBeCloseTo(expectedPlatformShare, 2);

        // Verify creator + platform = net
        expect(revenueSplit.creatorShare + revenueSplit.platformShare).toBeCloseTo(
          revenueSplit.netAmount,
          2
        );

        // Create transaction to verify
        const transaction = new Transaction({
          type: 'license_payment',
          grossAmount: testAmount,
          stripeFee: revenueSplit.stripeFee,
          netAmount: revenueSplit.netAmount,
          creatorShare: revenueSplit.creatorShare,
          platformShare: revenueSplit.platformShare,
          status: 'completed',
          payer: testBusiness2._id,
          payee: testBusiness1._id,
          relatedLicense: testLicense._id
        });

        await transaction.save();

        // Verify transaction amounts
        expect(transaction.creatorShare).toBeCloseTo(revenueSplit.creatorShare, 2);
        expect(transaction.platformShare).toBeCloseTo(revenueSplit.platformShare, 2);
      });
    });

    test('should verify tier split percentages are correct', () => {
      const testAmount = 100.00;
      
      tiers.forEach(tier => {
        const tierConfig = TIER_CONFIG[tier];
        const revenueSplit = calculateRevenueSplit(testAmount, tierConfig);
        
        // Calculate actual percentages
        const actualCreatorPercent = (revenueSplit.creatorShare / revenueSplit.netAmount) * 100;
        const actualPlatformPercent = (revenueSplit.platformShare / revenueSplit.netAmount) * 100;
        
        // Verify percentages match tier config
        expect(actualCreatorPercent).toBeCloseTo(tierConfig.revenueSplit.creator, 1);
        expect(actualPlatformPercent).toBeCloseTo(tierConfig.revenueSplit.platform, 1);
        expect(actualCreatorPercent + actualPlatformPercent).toBeCloseTo(100, 1);
      });
    });
  });

  describe('Chargeback Reserve', () => {
    test('should calculate chargeback reserve correctly', async () => {
      const creatorShare = 77.44; // From $100 sale on free tier
      
      // Calculate reserve
      const reserve = calculateChargebackReserve(creatorShare);

      // Verify reserve amount (5% of creator share)
      const expectedReserve = creatorShare * 0.05;
      expect(reserve.reserveAmount).toBeCloseTo(expectedReserve, 2);

      // Verify immediate payout (95% of creator share)
      const expectedImmediate = creatorShare * 0.95;
      expect(reserve.immediatePayout).toBeCloseTo(expectedImmediate, 2);

      // Verify immediate + reserve = creator share
      expect(reserve.immediatePayout + reserve.reserveAmount).toBeCloseTo(
        creatorShare,
        2
      );

      // Verify release date (90 days from now)
      const expectedReleaseDate = new Date();
      expectedReleaseDate.setDate(expectedReleaseDate.getDate() + 90);
      
      const releaseDate = new Date(reserve.reserveReleaseDate);
      const daysDifference = Math.floor(
        (releaseDate - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      // Allow 1 day tolerance for timing differences
      expect(daysDifference).toBeGreaterThanOrEqual(89);
      expect(daysDifference).toBeLessThanOrEqual(91);
    });

    test('should create transaction with reserve metadata', async () => {
      const grossAmount = 100.00;
      const tierConfig = TIER_CONFIG.free;
      const revenueSplit = calculateRevenueSplit(grossAmount, tierConfig);
      const reserve = calculateChargebackReserve(revenueSplit.creatorShare);

      // Create transaction with reserve metadata
      const transaction = new Transaction({
        type: 'license_payment',
        grossAmount: grossAmount,
        stripeFee: revenueSplit.stripeFee,
        netAmount: revenueSplit.netAmount,
        creatorShare: revenueSplit.creatorShare,
        platformShare: revenueSplit.platformShare,
        status: 'completed',
        payer: testBusiness2._id,
        payee: testBusiness1._id,
        relatedLicense: testLicense._id,
        metadata: {
          chargebackReserve: {
            amount: reserve.reserveAmount,
            immediatePayout: reserve.immediatePayout,
            releaseDate: reserve.reserveReleaseDate
          }
        }
      });

      await transaction.save();

      // Verify reserve metadata
      expect(transaction.metadata.chargebackReserve).toBeDefined();
      expect(transaction.metadata.chargebackReserve.amount).toBeCloseTo(
        reserve.reserveAmount,
        2
      );
      expect(transaction.metadata.chargebackReserve.immediatePayout).toBeCloseTo(
        reserve.immediatePayout,
        2
      );
    });
  });

  describe('Pool Revenue Distribution', () => {
    // Create pool collection before all pool tests
    beforeAll(async () => {
      testCollection = await Collection.create({
        name: 'Test Pool',
        description: 'Test pool for revenue distribution',
        ownerId: testBusiness1._id,
        poolType: 'complementary',
        memberBusinesses: [
          testBusiness1._id,
          testBusiness2._id,
          testBusiness3._id
        ],
        revenueSharingModel: {
          split: 'custom',
          distribution: {
            [testBusiness1._id.toString()]: 40,
            [testBusiness2._id.toString()]: 35,
            [testBusiness3._id.toString()]: 25
          }
        },
        totalRevenue: 0,
        totalLicenses: 0,
        memberEarnings: []
      });
    });

    test('should calculate pool distribution correctly', async () => {
      const grossAmount = 100.00;
      const tierConfig = TIER_CONFIG.partner; // Partner tier allows pools

      // Create members array from collection
      const members = [
        {
          businessId: testBusiness1._id,
          contributionPercent: 40
        },
        {
          businessId: testBusiness2._id,
          contributionPercent: 35
        },
        {
          businessId: testBusiness3._id,
          contributionPercent: 25
        }
      ];

      // Calculate base revenue split for pool
      const baseRevenueSplit = calculatePoolBaseRevenue(grossAmount, tierConfig);

      // Verify base split
      expect(baseRevenueSplit.grossAmount).toBe(grossAmount);
      expect(baseRevenueSplit.creatorShare).toBeGreaterThan(0);
      expect(baseRevenueSplit.platformShare).toBeGreaterThan(0);

      // Calculate member distribution
      const memberDistribution = calculateMemberDistribution(
        baseRevenueSplit.creatorShare,
        members
      );

      // Verify distribution
      expect(memberDistribution).toHaveLength(3);

      // Verify member 1 (40%)
      const member1 = memberDistribution.find(
        m => m.businessId.toString() === testBusiness1._id.toString()
      );
      expect(member1).toBeDefined();
      expect(member1.contributionPercent).toBe(40);
      expect(member1.memberShare).toBeGreaterThan(0);
      expect(member1.reserveAmount).toBeGreaterThan(0);
      expect(member1.immediatePayout).toBeGreaterThan(0);

      // Verify member 2 (35%)
      const member2 = memberDistribution.find(
        m => m.businessId.toString() === testBusiness2._id.toString()
      );
      expect(member2).toBeDefined();
      expect(member2.contributionPercent).toBe(35);
      expect(member2.memberShare).toBeGreaterThan(0);

      // Verify member 3 (25%)
      const member3 = memberDistribution.find(
        m => m.businessId.toString() === testBusiness3._id.toString()
      );
      expect(member3).toBeDefined();
      expect(member3.contributionPercent).toBe(25);
      expect(member3.memberShare).toBeGreaterThan(0);

      // Verify total shares equal pool creator share
      const totalShares = memberDistribution.reduce(
        (sum, member) => sum + member.memberShare,
        0
      );
      expect(totalShares).toBeCloseTo(baseRevenueSplit.creatorShare, 2);

      // Verify each member's share + reserve = their portion
      memberDistribution.forEach(member => {
        const expectedShare = baseRevenueSplit.creatorShare * (member.contributionPercent / 100);
        expect(member.memberShare).toBeCloseTo(expectedShare, 2);
        expect(member.immediatePayout + member.reserveAmount).toBeCloseTo(
          member.memberShare,
          2
        );
      });
    });

    test('should create transactions for each pool member', async () => {
      const grossAmount = 100.00;
      const tierConfig = TIER_CONFIG.partner;

      // Create members array from collection
      const members = [
        {
          businessId: testBusiness1._id,
          contributionPercent: 40
        },
        {
          businessId: testBusiness2._id,
          contributionPercent: 35
        },
        {
          businessId: testBusiness3._id,
          contributionPercent: 25
        }
      ];

      // Calculate pool distribution
      const baseRevenueSplit = calculatePoolBaseRevenue(grossAmount, tierConfig);
      const memberDistribution = calculateMemberDistribution(
        baseRevenueSplit.creatorShare,
        members
      );

      // Create transactions for each member
      const transactions = [];
      for (const member of memberDistribution) {
        // Calculate proportional amounts for this member
        const memberGrossAmount = grossAmount * (member.contributionPercent / 100);
        const memberStripeFee = baseRevenueSplit.stripeFee * (member.contributionPercent / 100);
        const memberNetAmount = memberGrossAmount - memberStripeFee;
        
        // For pool transactions, the member gets their share of the creator portion
        // The netAmount is the proportional net, and creatorShare is their portion
        const transaction = new Transaction({
          type: 'license_payment',
          grossAmount: memberGrossAmount,
          stripeFee: memberStripeFee,
          netAmount: memberNetAmount,
          creatorShare: member.memberShare, // Member's share from pool distribution
          platformShare: memberNetAmount - member.memberShare, // Remaining goes to platform
          status: 'completed',
          payer: testBusiness2._id,
          payee: member.businessId,
          relatedLicense: testLicense._id,
          metadata: {
            collectionId: testCollection._id,
            contributionPercent: member.contributionPercent,
            chargebackReserve: {
              amount: member.reserveAmount,
              immediatePayout: member.immediatePayout,
              releaseDate: member.reserveReleaseDate
            }
          }
        });

        await transaction.save();
        transactions.push(transaction);
      }

      // Verify all transactions created
      expect(transactions).toHaveLength(3);

      // Verify total creator shares match pool creator share
      const totalCreatorShares = transactions.reduce(
        (sum, t) => sum + t.creatorShare,
        0
      );
      expect(totalCreatorShares).toBeCloseTo(baseRevenueSplit.creatorShare, 2);

      // Verify all transactions have correct structure
      transactions.forEach(transaction => {
        expect(transaction.type).toBe('license_payment');
        expect(transaction.status).toBe('completed');
        expect(transaction.creatorShare).toBeGreaterThan(0);
        expect(transaction.metadata.collectionId).toBeDefined();
        expect(transaction.metadata.contributionPercent).toBeDefined();
        expect(transaction.metadata.chargebackReserve).toBeDefined();
      });
    });

    test('should verify pool distribution totals match', () => {
      const grossAmount = 100.00;
      const tierConfig = TIER_CONFIG.partner;

      // Create members array from collection
      const members = [
        {
          businessId: testBusiness1._id,
          contributionPercent: 40
        },
        {
          businessId: testBusiness2._id,
          contributionPercent: 35
        },
        {
          businessId: testBusiness3._id,
          contributionPercent: 25
        }
      ];

      // Calculate using pool distribution function
      const poolDistribution = calculatePoolDistribution(
        grossAmount,
        tierConfig,
        members
      );

      // Verify base revenue split
      expect(poolDistribution.baseSplit).toBeDefined();
      expect(poolDistribution.baseSplit.grossAmount).toBe(grossAmount);

      // Verify member distributions
      expect(poolDistribution.memberDistributions).toHaveLength(3);

      // Verify total distributed equals pool creator share
      const totalDistributed = poolDistribution.memberDistributions.reduce(
        (sum, member) => sum + (member.totalShare || member.memberShare || 0),
        0
      );
      expect(totalDistributed).toBeCloseTo(
        poolDistribution.baseSplit.creatorShare,
        2
      );

      // Verify each member's percentages
      const totalPercent = poolDistribution.memberDistributions.reduce(
        (sum, member) => sum + member.contributionPercent,
        0
      );
      expect(totalPercent).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    test('should handle $0.30 minimum Stripe fee', () => {
      const grossAmount = 0.01; // Very small amount
      const stripeFee = calculateStripeFee(grossAmount);
      
      // Stripe fee should be at least $0.30
      expect(stripeFee).toBeGreaterThanOrEqual(0.30);
    });

    test('should handle large amounts correctly', () => {
      const grossAmount = 10000.00; // Large sale
      const tierConfig = TIER_CONFIG.equityPartner;
      const revenueSplit = calculateRevenueSplit(grossAmount, tierConfig);

      // Verify all amounts are positive
      expect(revenueSplit.stripeFee).toBeGreaterThan(0);
      expect(revenueSplit.netAmount).toBeGreaterThan(0);
      expect(revenueSplit.creatorShare).toBeGreaterThan(0);
      expect(revenueSplit.platformShare).toBeGreaterThan(0);

      // Verify creator + platform = net (allow for rounding differences)
      const total = revenueSplit.creatorShare + revenueSplit.platformShare;
      expect(Math.abs(total - revenueSplit.netAmount)).toBeLessThan(0.02);
    });

    test('should handle exact $100 amounts for all tiers', () => {
      const grossAmount = 100.00;
      const tiers = ['free', 'contributor', 'partner', 'equityPartner'];

      tiers.forEach(tier => {
        const tierConfig = TIER_CONFIG[tier];
        const revenueSplit = calculateRevenueSplit(grossAmount, tierConfig);

        // All amounts should be valid
        expect(revenueSplit.stripeFee).toBeGreaterThan(0);
        expect(revenueSplit.netAmount).toBeGreaterThan(0);
        expect(revenueSplit.creatorShare).toBeGreaterThan(0);
        expect(revenueSplit.platformShare).toBeGreaterThan(0);

        // Creator share should increase with tier
        if (tier === 'free') {
          expect(revenueSplit.creatorShare).toBeCloseTo(77.44, 2);
        } else if (tier === 'contributor') {
          expect(revenueSplit.creatorShare).toBeGreaterThan(77.44);
        } else if (tier === 'partner') {
          expect(revenueSplit.creatorShare).toBeGreaterThan(82.28);
        } else if (tier === 'equityPartner') {
          expect(revenueSplit.creatorShare).toBeGreaterThan(87.12);
        }
      });
    });
  });
});

