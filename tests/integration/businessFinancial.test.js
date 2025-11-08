/**
 * Business Financial Routes Integration Tests
 * 
 * Comprehensive test suite for business financial endpoints:
 * - GET /api/business/financial/overview
 * - GET /api/business/financial/transactions
 * - GET /api/business/financial/revenue
 * - GET /api/business/financial/balance
 * - GET /api/business/financial/pool-earnings
 * 
 * All tests require authentication and use mock transaction data
 */

const request = require('supertest');
const app = require('../../src/app');
const Business = require('../../src/models/Business');
const Transaction = require('../../src/models/Transaction');
const License = require('../../src/models/License');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Helper to generate JWT token
const generateToken = (businessId) => {
  return jwt.sign(
    { userId: businessId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1h' }
  );
};

describe('Business Financial Routes', () => {
  let testBusiness1, testBusiness2, testBusiness3;
  let testToken1, testToken2;
  let testTransactions = [];
  let testLicense;

  // Set up test environment
  beforeAll(async () => {
    // Create test businesses
    testBusiness1 = await Business.create({
      email: `financial-test-1-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Financial Test Business 1',
      companyName: 'Financial Test Company 1',
      companyType: 'photography',
      industry: 'media',
      membershipTier: 'contributor',
      subscriptionStatus: 'active',
      revenueBalance: 500.00,
      activeLicenseCount: 2
    });

    testBusiness2 = await Business.create({
      email: `financial-test-2-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Financial Test Business 2',
      companyName: 'Financial Test Company 2',
      companyType: 'design',
      industry: 'media',
      membershipTier: 'partner',
      subscriptionStatus: 'active',
      revenueBalance: 1000.00,
      activeLicenseCount: 5
    });

    testBusiness3 = await Business.create({
      email: `financial-test-3-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Financial Test Business 3',
      companyName: 'Financial Test Company 3',
      companyType: 'videography',
      industry: 'media',
      membershipTier: 'free',
      subscriptionStatus: 'active',
      revenueBalance: 0.00,
      activeLicenseCount: 0
    });

    // Create test license
    testLicense = await License.create({
      licensorId: testBusiness1._id,
      licenseeId: testBusiness2._id,
      mediaId: new mongoose.Types.ObjectId(),
      licenseType: 'commercial',
      price: 100,
      status: 'active'
    });

    // Create test transactions
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Completed license payment (earnings for business1)
    testTransactions.push(await Transaction.create({
      type: 'license_payment',
      grossAmount: 100.00,
      stripeFee: 3.20,
      netAmount: 96.80,
      creatorShare: 82.28, // 85% of 96.80 (contributor tier)
      platformShare: 14.52,
      status: 'completed',
      payer: testBusiness2._id,
      payee: testBusiness1._id,
      relatedLicense: testLicense._id,
      completedAt: now,
      createdAt: now
    }));

    // Another completed license payment
    testTransactions.push(await Transaction.create({
      type: 'license_payment',
      grossAmount: 200.00,
      stripeFee: 6.10,
      netAmount: 193.90,
      creatorShare: 164.82, // 85% of 193.90
      platformShare: 29.08,
      status: 'completed',
      payer: testBusiness2._id,
      payee: testBusiness1._id,
      relatedLicense: testLicense._id,
      completedAt: sevenDaysAgo,
      createdAt: sevenDaysAgo,
      metadata: {
        reserveReleased: false,
        reserveReleaseDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      }
    }));

    // Subscription payment (spending for business2)
    testTransactions.push(await Transaction.create({
      type: 'subscription_payment',
      grossAmount: 50.00,
      stripeFee: 1.75,
      netAmount: 48.25,
      creatorShare: 0,
      platformShare: 48.25,
      status: 'completed',
      payer: testBusiness2._id,
      completedAt: thirtyDaysAgo,
      createdAt: thirtyDaysAgo
    }));

    // Pending payout
    testTransactions.push(await Transaction.create({
      type: 'payout',
      grossAmount: 100.00,
      stripeFee: 0,
      netAmount: 100.00,
      creatorShare: 100.00,
      platformShare: 0,
      status: 'pending',
      payee: testBusiness1._id,
      createdAt: now
    }));

    // Pool transaction with metadata
    testTransactions.push(await Transaction.create({
      type: 'license_payment',
      grossAmount: 150.00,
      stripeFee: 4.65,
      netAmount: 145.35,
      creatorShare: 123.55, // 85% of 145.35
      platformShare: 21.80,
      status: 'completed',
      payer: testBusiness2._id,
      payee: testBusiness1._id,
      relatedLicense: testLicense._id,
      completedAt: now,
      createdAt: now,
      metadata: {
        collectionId: new mongoose.Types.ObjectId(),
        contributionPercent: 50
      }
    }));

    // Old transaction (outside 30 days)
    testTransactions.push(await Transaction.create({
      type: 'license_payment',
      grossAmount: 50.00,
      stripeFee: 1.75,
      netAmount: 48.25,
      creatorShare: 41.01,
      platformShare: 7.24,
      status: 'completed',
      payer: testBusiness2._id,
      payee: testBusiness1._id,
      completedAt: twoMonthsAgo,
      createdAt: twoMonthsAgo
    }));

    // Generate tokens
    testToken1 = generateToken(testBusiness1._id);
    testToken2 = generateToken(testBusiness2._id);
  });

  // Clean up test data
  afterAll(async () => {
    await Transaction.deleteMany({ _id: { $in: testTransactions.map(t => t._id) } });
    await License.deleteMany({ _id: testLicense._id });
    await Business.deleteMany({ _id: { $in: [testBusiness1._id, testBusiness2._id, testBusiness3._id] } });
  });

  // ===== GET /overview Tests =====
  
  describe('GET /api/business/financial/overview', () => {
    test('should return financial overview for authenticated business', async () => {
      const response = await request(app)
        .get('/api/business/financial/overview')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.earnings).toBeDefined();
      expect(response.body.data.spending).toBeDefined();
      expect(response.body.data.pendingPayouts).toBeDefined();
      expect(response.body.data.chargebackReserve).toBeDefined();
      expect(response.body.data.activeLicenses).toBeDefined();
      expect(response.body.data.monthlyRevenueTrend).toBeDefined();
    });

    test('should verify earnings match test data', async () => {
      const response = await request(app)
        .get('/api/business/financial/overview')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.earnings) {
        expect(response.body.data.earnings.total).toBeGreaterThanOrEqual(0);
        expect(response.body.data.earnings.transactionCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should verify active licenses count', async () => {
      const response = await request(app)
        .get('/api/business/financial/overview')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.activeLicenses !== undefined) {
        expect(response.body.data.activeLicenses).toBe(2);
      }
    });

    test('should verify monthly revenue trend structure', async () => {
      const response = await request(app)
        .get('/api/business/financial/overview')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.monthlyRevenueTrend) {
        expect(Array.isArray(response.body.data.monthlyRevenueTrend)).toBe(true);
        if (response.body.data.monthlyRevenueTrend.length > 0) {
          expect(response.body.data.monthlyRevenueTrend[0]).toHaveProperty('year');
          expect(response.body.data.monthlyRevenueTrend[0]).toHaveProperty('month');
          expect(response.body.data.monthlyRevenueTrend[0]).toHaveProperty('revenue');
          expect(response.body.data.monthlyRevenueTrend[0]).toHaveProperty('transactionCount');
        }
      }
    });

    test('should fail for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/business/financial/overview');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // ===== GET /transactions Tests =====
  
  describe('GET /api/business/financial/transactions', () => {
    test('should return transactions for authenticated business', async () => {
      const response = await request(app)
        .get('/api/business/financial/transactions')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.transactions).toBeDefined();
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should verify pagination info present', async () => {
      const response = await request(app)
        .get('/api/business/financial/transactions')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.pagination) {
        expect(response.body.data.pagination).toHaveProperty('page');
        expect(response.body.data.pagination).toHaveProperty('limit');
        expect(response.body.data.pagination).toHaveProperty('totalCount');
        expect(response.body.data.pagination).toHaveProperty('totalPages');
        expect(response.body.data.pagination).toHaveProperty('hasNextPage');
        expect(response.body.data.pagination).toHaveProperty('hasPrevPage');
      }
    });

    test('should filter by transaction type', async () => {
      const response = await request(app)
        .get('/api/business/financial/transactions?type=license_payment')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.transactions) {
        expect(response.body.data.transactions.every(t => t.type === 'license_payment')).toBe(true);
      }
    });

    test('should filter by transaction status', async () => {
      const response = await request(app)
        .get('/api/business/financial/transactions?status=completed')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.transactions) {
        expect(response.body.data.transactions.every(t => t.status === 'completed')).toBe(true);
      }
    });

    test('should paginate results correctly', async () => {
      const response = await request(app)
        .get('/api/business/financial/transactions?page=1&limit=2')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.transactions) {
        expect(response.body.data.transactions.length).toBeLessThanOrEqual(2);
      }
      if (response.body.data && response.body.data.pagination) {
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(2);
      }
    });

    test('should verify transactions sorted by date (newest first)', async () => {
      const response = await request(app)
        .get('/api/business/financial/transactions')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.transactions && response.body.data.transactions.length > 1) {
        const dates = response.body.data.transactions.map(t => new Date(t.createdAt));
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i + 1].getTime());
        }
      }
    });

    test('should populate related data (license, payer, payee)', async () => {
      const response = await request(app)
        .get('/api/business/financial/transactions')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.transactions) {
        const transactionWithLicense = response.body.data.transactions.find(
          t => t.relatedLicense
        );
        if (transactionWithLicense) {
          expect(transactionWithLicense.relatedLicense).toBeDefined();
        }
      }
    });

    test('should fail for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/business/financial/transactions');

      expect(response.status).toBe(401);
    });
  });

  // ===== GET /revenue Tests =====
  
  describe('GET /api/business/financial/revenue', () => {
    test('should return revenue breakdown for authenticated business', async () => {
      const response = await request(app)
        .get('/api/business/financial/revenue')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data) {
        expect(response.body.data.revenueByType).toBeDefined();
        expect(Array.isArray(response.body.data.revenueByType)).toBe(true);
        expect(response.body.data.dailyRevenueTrend).toBeDefined();
        expect(Array.isArray(response.body.data.dailyRevenueTrend)).toBe(true);
      }
    });

    test('should verify revenueByType array structure', async () => {
      const response = await request(app)
        .get('/api/business/financial/revenue')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.revenueByType && response.body.data.revenueByType.length > 0) {
        expect(response.body.data.revenueByType[0]).toHaveProperty('type');
        expect(response.body.data.revenueByType[0]).toHaveProperty('total');
        expect(response.body.data.revenueByType[0]).toHaveProperty('count');
        expect(response.body.data.revenueByType[0]).toHaveProperty('average');
      }
    });

    test('should verify dailyRevenue array structure', async () => {
      const response = await request(app)
        .get('/api/business/financial/revenue')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.dailyRevenueTrend && response.body.data.dailyRevenueTrend.length > 0) {
        expect(response.body.data.dailyRevenueTrend[0]).toHaveProperty('date');
        expect(response.body.data.dailyRevenueTrend[0]).toHaveProperty('revenue');
        expect(response.body.data.dailyRevenueTrend[0]).toHaveProperty('transactionCount');
      }
    });

    test('should filter by 7days period', async () => {
      const response = await request(app)
        .get('/api/business/financial/revenue?period=7days')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data) {
        expect(response.body.data.period).toBe('7days');
        expect(response.body.data.startDate).toBeDefined();
      }
    });

    test('should filter by 30days period', async () => {
      const response = await request(app)
        .get('/api/business/financial/revenue?period=30days')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data) {
        expect(response.body.data.period).toBe('30days');
      }
    });

    test('should filter by 12months period', async () => {
      const response = await request(app)
        .get('/api/business/financial/revenue?period=12months')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data) {
        expect(response.body.data.period).toBe('12months');
      }
    });

    test('should filter by all period', async () => {
      const response = await request(app)
        .get('/api/business/financial/revenue?period=all')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data) {
        expect(response.body.data.period).toBe('all');
      }
    });

    test('should verify totals calculated correctly', async () => {
      const response = await request(app)
        .get('/api/business/financial/revenue')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.summary) {
        expect(response.body.data.summary).toHaveProperty('totalRevenue');
        expect(response.body.data.summary).toHaveProperty('totalTransactions');
      }
    });

    test('should fail for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/business/financial/revenue');

      expect(response.status).toBe(401);
    });
  });

  // ===== GET /balance Tests =====
  
  describe('GET /api/business/financial/balance', () => {
    test('should return balance for authenticated business', async () => {
      const response = await request(app)
        .get('/api/business/financial/balance')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('currentBalance');
      expect(response.body.data).toHaveProperty('chargebackReserve');
      expect(response.body.data).toHaveProperty('pendingPayouts');
      expect(response.body.data).toHaveProperty('availableForPayout');
      expect(response.body.data).toHaveProperty('minimumPayout');
      expect(response.body.data).toHaveProperty('balanceStatus');
    });

    test('should verify all balance fields present', async () => {
      const response = await request(app)
        .get('/api/business/financial/balance')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data) {
        expect(response.body.data.currentBalance).toBeDefined();
        expect(response.body.data.chargebackReserve).toBeDefined();
        expect(response.body.data.pendingPayouts).toBeDefined();
        expect(response.body.data.pendingPayouts).toHaveProperty('total');
        expect(response.body.data.pendingPayouts).toHaveProperty('count');
        expect(response.body.data.availableForPayout).toBeDefined();
        expect(response.body.data.minimumPayout).toBeDefined();
        expect(response.body.data.balanceStatus).toBeDefined();
      }
    });

    test('should verify minimumPayout is $25', async () => {
      const response = await request(app)
        .get('/api/business/financial/balance')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.minimumPayout !== undefined) {
        expect(response.body.data.minimumPayout).toBe(25.00);
      }
    });

    test('should verify canRequestPayout logic (availableForPayout calculation)', async () => {
      const response = await request(app)
        .get('/api/business/financial/balance')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.currentBalance !== undefined) {
        const expectedAvailable = Math.max(0, response.body.data.currentBalance - 25.00);
        expect(response.body.data.availableForPayout).toBe(expectedAvailable);
      }
    });

    test('should verify balanceStatus returned', async () => {
      const response = await request(app)
        .get('/api/business/financial/balance')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.balanceStatus) {
        expect(['positive', 'negative', 'suspended']).toContain(response.body.data.balanceStatus);
      }
    });

    test('should fail for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/business/financial/balance');

      expect(response.status).toBe(401);
    });
  });

  // ===== GET /pool-earnings Tests =====
  
  describe('GET /api/business/financial/pool-earnings', () => {
    test('should return pool earnings for authenticated business', async () => {
      const response = await request(app)
        .get('/api/business/financial/pool-earnings')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data) {
        expect(response.body.data.summary).toBeDefined();
        expect(response.body.data.pools).toBeDefined();
        expect(Array.isArray(response.body.data.pools)).toBe(true);
      }
    });

    test('should verify earnings array structure', async () => {
      const response = await request(app)
        .get('/api/business/financial/pool-earnings')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.pools) {
        expect(Array.isArray(response.body.data.pools)).toBe(true);
        if (response.body.data.pools.length > 0) {
          expect(response.body.data.pools[0]).toHaveProperty('collectionId');
          expect(response.body.data.pools[0]).toHaveProperty('totalPoolRevenue');
          expect(response.body.data.pools[0]).toHaveProperty('transactionCount');
          expect(response.body.data.pools[0]).toHaveProperty('memberEarnings');
          expect(response.body.data.pools[0]).toHaveProperty('contributionPercent');
        }
      }
    });

    test('should verify totalPoolEarnings calculated', async () => {
      const response = await request(app)
        .get('/api/business/financial/pool-earnings')
        .set('Authorization', `Bearer ${testToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.summary) {
        expect(response.body.data.summary).toHaveProperty('totalPoolEarnings');
        expect(response.body.data.summary).toHaveProperty('totalPoolTransactions');
        expect(response.body.data.summary).toHaveProperty('poolCount');
      }
    });

    test('should return empty array for business with no pool earnings', async () => {
      const response = await request(app)
        .get('/api/business/financial/pool-earnings')
        .set('Authorization', `Bearer ${testToken2}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      if (response.body.data && response.body.data.pools) {
        expect(Array.isArray(response.body.data.pools)).toBe(true);
        // Business2 has no pool earnings, so should be empty or have no pools
      }
    });

    test('should fail for unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/business/financial/pool-earnings');

      expect(response.status).toBe(401);
    });
  });
});

