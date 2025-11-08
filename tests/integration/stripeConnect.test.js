/**
 * Stripe Connect Integration Tests
 * 
 * Comprehensive test suite for Stripe Connect flows:
 * - Connect account onboarding
 * - Connect account status checking
 * - Payout requests
 * 
 * All tests use mock Stripe API - no real Stripe calls
 */

const request = require('supertest');
const app = require('../../src/app');
const Business = require('../../src/models/Business');
const Transaction = require('../../src/models/Transaction');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const {
  createMockConnectAccount,
  createMockPayout
} = require('../../tests/helpers/stripeMocks');

// Set Stripe secrets for testing
const TEST_STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing';
process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY;
process.env.FRONTEND_URL = 'http://localhost:3000';

// Mock Stripe config
jest.mock('../../src/config/stripe', () => {
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
});

// Helper to generate JWT token
const generateToken = (businessId) => {
  return jwt.sign(
    { userId: businessId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1h' }
  );
};

describe('Stripe Connect Integration Tests', () => {
  let testBusiness1, testBusiness2;
  let testToken1, testToken2;

  // Set up test environment
  beforeAll(async () => {
    // Create test businesses
    testBusiness1 = await Business.create({
      email: `connect-test-1-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Connect Test Business 1',
      companyName: 'Connect Test Company 1',
      companyType: 'photography',
      industry: 'media',
      membershipTier: 'partner',
      subscriptionStatus: 'active',
      revenueBalance: 1000.00,
      stripeConnectAccountId: null,
      stripeConnectStatus: 'not_started'
    });

    testBusiness2 = await Business.create({
      email: `connect-test-2-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Connect Test Business 2',
      companyName: 'Connect Test Company 2',
      companyType: 'design',
      industry: 'media',
      membershipTier: 'partner',
      subscriptionStatus: 'active',
      revenueBalance: 500.00,
      stripeConnectAccountId: 'acct_test123',
      stripeConnectStatus: 'active'
    });

    testToken1 = generateToken(testBusiness1._id);
    testToken2 = generateToken(testBusiness2._id);
  });

  beforeEach(async () => {
    // Reload businesses from database (global afterEach clears collections)
    testBusiness1 = await Business.findById(testBusiness1._id);
    testBusiness2 = await Business.findById(testBusiness2._id);
    
    // Recreate if they were deleted
    if (!testBusiness1) {
      testBusiness1 = await Business.create({
        email: `connect-test-1-${Date.now()}@test.com`,
        password: 'password123',
        name: 'Connect Test Business 1',
        companyName: 'Connect Test Company 1',
        companyType: 'photography',
        industry: 'media',
        membershipTier: 'partner',
        subscriptionStatus: 'active',
        revenueBalance: 1000.00,
        stripeConnectAccountId: null,
        stripeConnectStatus: 'not_started'
      });
      testToken1 = generateToken(testBusiness1._id);
    }
    
    if (!testBusiness2) {
      testBusiness2 = await Business.create({
        email: `connect-test-2-${Date.now()}@test.com`,
        password: 'password123',
        name: 'Connect Test Business 2',
        companyName: 'Connect Test Company 2',
        companyType: 'design',
        industry: 'media',
        membershipTier: 'partner',
        subscriptionStatus: 'active',
        revenueBalance: 500.00,
        stripeConnectAccountId: 'acct_test123',
        stripeConnectStatus: 'active'
      });
      testToken2 = generateToken(testBusiness2._id);
    }
  });

  afterEach(async () => {
    // Clean up transactions created during tests
    await Transaction.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await Business.deleteMany({ _id: { $in: [testBusiness1._id, testBusiness2._id] } });
    await Transaction.deleteMany({});
  });

  // ===== Connect Onboarding Tests =====

  describe('POST /api/business/stripe/connect/onboard', () => {
    test('should onboard business to Stripe Connect successfully', async () => {
      const mockAccount = createMockConnectAccount({
        id: 'acct_new123',
        type: 'express',
        metadata: { businessId: testBusiness1._id.toString() }
      });

      const mockAccountLink = {
        object: 'account_link',
        url: 'https://connect.stripe.com/setup/s/acct_new123',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };

      // Mock Stripe methods
      const stripe = require('../../src/config/stripe');
      stripe.accounts.create = jest.fn().mockResolvedValue(mockAccount);
      stripe.accountLinks.create = jest.fn().mockResolvedValue(mockAccountLink);

      const response = await request(app)
        .post('/api/business/stripe/connect/onboard')
        .set('Authorization', `Bearer ${testToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accountId).toBe('acct_new123');
      expect(response.body.data.onboardingUrl).toBeDefined();

      // Verify business was updated
      const updatedBusiness = await Business.findById(testBusiness1._id);
      expect(updatedBusiness.stripeConnectAccountId).toBe('acct_new123');
      expect(updatedBusiness.stripeConnectStatus).toBe('pending');
    });

    test('should reject onboarding if already onboarded', async () => {
      // Set up business with existing Connect account
      testBusiness1.stripeConnectAccountId = 'acct_existing123';
      await testBusiness1.save();

      const response = await request(app)
        .post('/api/business/stripe/connect/onboard')
        .set('Authorization', `Bearer ${testToken1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('already_onboarded');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/business/stripe/connect/onboard')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ===== Connect Status Tests =====

  describe('GET /api/business/stripe/connect/status', () => {
    test('should return active status for active Connect account', async () => {
      const mockAccount = createMockConnectAccount({
        id: 'acct_test123',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true
      });

      const stripe = require('../../src/config/stripe');
      stripe.accounts.retrieve = jest.fn().mockResolvedValue(mockAccount);

      const response = await request(app)
        .get('/api/business/stripe/connect/status')
        .set('Authorization', `Bearer ${testToken2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
      expect(response.body.data.accountId).toBe('acct_test123');
    });

    test('should return not_started status if no Connect account', async () => {
      // Reset business Connect account
      testBusiness1.stripeConnectAccountId = null;
      await testBusiness1.save();

      const response = await request(app)
        .get('/api/business/stripe/connect/status')
        .set('Authorization', `Bearer ${testToken1}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('not_started');
      expect(response.body.data.accountId).toBeNull();
    });

    test('should return pending status for incomplete account', async () => {
      const mockAccount = createMockConnectAccount({
        id: 'acct_test123',
        details_submitted: true,
        charges_enabled: false,
        payouts_enabled: false
      });

      const stripe = require('../../src/config/stripe');
      stripe.accounts.retrieve = jest.fn().mockResolvedValue(mockAccount);

      // Set business to pending
      testBusiness2.stripeConnectStatus = 'pending';
      await testBusiness2.save();

      const response = await request(app)
        .get('/api/business/stripe/connect/status')
        .set('Authorization', `Bearer ${testToken2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/business/stripe/connect/status')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ===== Payout Request Tests =====

  describe('POST /api/business/payouts/request', () => {
    test('should create payout request successfully', async () => {
      // Set up business with active Connect account and sufficient balance
      testBusiness2.revenueBalance = 1000.00;
      testBusiness2.stripeConnectAccountId = 'acct_test123';
      testBusiness2.stripeConnectStatus = 'active';
      await testBusiness2.save();

      const mockPayout = createMockPayout({
        id: 'po_test123',
        amount: 50000, // $500.00 in cents
        status: 'pending'
      });

      const stripe = require('../../src/config/stripe');
      stripe.payouts.create = jest.fn().mockResolvedValue(mockPayout);

      const response = await request(app)
        .post('/api/business/payouts/request')
        .set('Authorization', `Bearer ${testToken2}`)
        .send({ amount: 500 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.payout.id).toBe('po_test123');
      expect(response.body.data.payout.amount).toBe(500);

      // Verify transaction was created
      const transaction = await Transaction.findOne({
        type: 'payout',
        stripePayoutId: 'po_test123'
      });

      expect(transaction).toBeDefined();
      // Amount is stored in cents in the controller (amount * 100)
      expect(transaction.grossAmount).toBe(50000); // $500.00 = 50000 cents
      expect(transaction.status).toBe('pending');

      // Verify business balance was updated
      const updatedBusiness = await Business.findById(testBusiness2._id);
      expect(updatedBusiness.revenueBalance).toBe(500.00);
    });

    test('should reject payout below minimum amount ($25)', async () => {
      // Ensure business has Connect account
      testBusiness2.stripeConnectAccountId = 'acct_test123';
      testBusiness2.stripeConnectStatus = 'active';
      await testBusiness2.save();

      const response = await request(app)
        .post('/api/business/payouts/request')
        .set('Authorization', `Bearer ${testToken2}`)
        .send({ amount: 20 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('below_minimum');
    });

    test('should reject payout if insufficient balance', async () => {
      // Set business balance to low amount
      testBusiness2.revenueBalance = 10.00;
      testBusiness2.stripeConnectAccountId = 'acct_test123';
      testBusiness2.stripeConnectStatus = 'active';
      await testBusiness2.save();

      const response = await request(app)
        .post('/api/business/payouts/request')
        .set('Authorization', `Bearer ${testToken2}`)
        .send({ amount: 500 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('insufficient_balance');
    });

    test('should reject payout if no Connect account', async () => {
      // Ensure business has no Connect account
      testBusiness1.stripeConnectAccountId = null;
      testBusiness1.stripeConnectStatus = 'not_started';
      await testBusiness1.save();

      const response = await request(app)
        .post('/api/business/payouts/request')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({ amount: 500 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('no_connect_account');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/business/payouts/request')
        .send({ amount: 500 })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

