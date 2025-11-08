/**
 * Subscription Payment Integration Tests
 * 
 * Comprehensive test suite for subscription payment flows:
 * - Subscription upgrade
 * - Subscription cancellation
 * - Transaction creation
 * - Business tier updates
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
  createMockCustomer,
  createMockSubscription,
  createMockPaymentMethod
} = require('../../tests/helpers/stripeMocks');

// Set Stripe secrets for testing
const TEST_STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing';
process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY;
process.env.STRIPE_PRICE_CONTRIBUTOR = 'price_test_contributor';
process.env.STRIPE_PRICE_PARTNER = 'price_test_partner';
process.env.STRIPE_PRICE_EQUITY_PARTNER = 'price_test_equity_partner';

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

describe('Subscription Payment Integration Tests', () => {
  let testBusiness1, testBusiness2;
  let testToken1, testToken2;

  // Set up test environment
  beforeAll(async () => {
    // Create test businesses
    testBusiness1 = await Business.create({
      email: `subscription-test-1-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Subscription Test Business 1',
      companyName: 'Subscription Test Company 1',
      companyType: 'photography',
      industry: 'media',
      membershipTier: 'free',
      subscriptionStatus: 'active',
      stripeCustomerId: null,
      stripeSubscriptionId: null
    });

    testBusiness2 = await Business.create({
      email: `subscription-test-2-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Subscription Test Business 2',
      companyName: 'Subscription Test Company 2',
      companyType: 'design',
      industry: 'media',
      membershipTier: 'contributor',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: 'sub_test123'
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
        email: `subscription-test-1-${Date.now()}@test.com`,
        password: 'password123',
        name: 'Subscription Test Business 1',
        companyName: 'Subscription Test Company 1',
        companyType: 'photography',
        industry: 'media',
        membershipTier: 'free',
        subscriptionStatus: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null
      });
      testToken1 = generateToken(testBusiness1._id);
    }
    
    if (!testBusiness2) {
      testBusiness2 = await Business.create({
        email: `subscription-test-2-${Date.now()}@test.com`,
        password: 'password123',
        name: 'Subscription Test Business 2',
        companyName: 'Subscription Test Company 2',
        companyType: 'design',
        industry: 'media',
        membershipTier: 'contributor',
        subscriptionStatus: 'active',
        stripeCustomerId: 'cus_test123',
        stripeSubscriptionId: 'sub_test123'
      });
      testToken2 = generateToken(testBusiness2._id);
    }
  });

  afterAll(async () => {
    // Clean up test data
    await Business.deleteMany({ _id: { $in: [testBusiness1._id, testBusiness2._id] } });
    await Transaction.deleteMany({});
  });

  // ===== Subscription Upgrade Tests =====

  describe('POST /api/subscriptions/upgrade', () => {
    test('should upgrade subscription to contributor tier successfully', async () => {
      const mockCustomer = createMockCustomer({
        id: 'cus_new123',
        email: testBusiness1.email,
        metadata: { businessId: testBusiness1._id.toString() }
      });

      const mockPaymentMethod = {
        id: 'pm_test123',
        customer: 'cus_new123',
        type: 'card'
      };

      const mockSubscription = createMockSubscription({
        id: 'sub_new123',
        customer: 'cus_new123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        metadata: { businessId: testBusiness1._id.toString(), tier: 'contributor' }
      });

      // Mock Stripe methods
      const stripe = require('../../src/config/stripe');
      stripe.customers.create = jest.fn().mockResolvedValue(mockCustomer);
      stripe.paymentMethods.attach = jest.fn().mockResolvedValue(mockPaymentMethod);
      stripe.subscriptions.create = jest.fn().mockResolvedValue(mockSubscription);

      const response = await request(app)
        .post('/api/subscriptions/upgrade')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          tier: 'contributor',
          paymentMethodId: 'pm_test123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription.id).toBe('sub_new123');
      expect(response.body.data.transaction).toBeDefined();

      // Verify business was updated
      const updatedBusiness = await Business.findById(testBusiness1._id);
      expect(updatedBusiness.membershipTier).toBe('contributor');
      expect(updatedBusiness.subscriptionStatus).toBe('active');
      expect(updatedBusiness.stripeCustomerId).toBe('cus_new123');
      expect(updatedBusiness.stripeSubscriptionId).toBe('sub_new123');
      expect(updatedBusiness.subscriptionExpiry).toBeDefined();

      // Verify transaction was created
      const transaction = await Transaction.findOne({
        type: 'subscription_payment',
        payer: testBusiness1._id
      });

      expect(transaction).toBeDefined();
      expect(transaction.status).toBe('completed');
      expect(transaction.platformShare).toBeGreaterThan(0);
    });

    test('should upgrade existing customer to partner tier', async () => {
      const mockSubscription = createMockSubscription({
        id: 'sub_partner123',
        customer: 'cus_test123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        metadata: { businessId: testBusiness2._id.toString(), tier: 'partner' }
      });

      const stripe = require('../../src/config/stripe');
      stripe.paymentMethods.attach = jest.fn().mockResolvedValue({ id: 'pm_test123' });
      stripe.subscriptions.create = jest.fn().mockResolvedValue(mockSubscription);

      const response = await request(app)
        .post('/api/subscriptions/upgrade')
        .set('Authorization', `Bearer ${testToken2}`)
        .send({
          tier: 'partner',
          paymentMethodId: 'pm_test123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify business was updated
      const updatedBusiness = await Business.findById(testBusiness2._id);
      expect(updatedBusiness.membershipTier).toBe('partner');
      expect(updatedBusiness.stripeSubscriptionId).toBe('sub_partner123');
    });

    test('should reject invalid tier', async () => {
      const response = await request(app)
        .post('/api/subscriptions/upgrade')
        .set('Authorization', `Bearer ${testToken1}`)
        .send({
          tier: 'invalid_tier',
          paymentMethodId: 'pm_test123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('invalid_tier');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/subscriptions/upgrade')
        .send({
          tier: 'contributor',
          paymentMethodId: 'pm_test123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  // ===== Subscription Cancellation Tests =====

  describe('POST /api/subscriptions/cancel', () => {
    test('should cancel subscription successfully', async () => {
      // Set up business with active subscription
      testBusiness2.stripeSubscriptionId = 'sub_test123';
      testBusiness2.membershipTier = 'contributor';
      await testBusiness2.save();

      const mockCancelledSubscription = createMockSubscription({
        id: 'sub_test123',
        status: 'canceled'
      });

      const stripe = require('../../src/config/stripe');
      stripe.subscriptions.cancel = jest.fn().mockResolvedValue(mockCancelledSubscription);

      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .set('Authorization', `Bearer ${testToken2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.subscription.status).toBe('canceled');

      // Verify business was updated
      const updatedBusiness = await Business.findById(testBusiness2._id);
      expect(updatedBusiness.membershipTier).toBe('free');
      expect(updatedBusiness.subscriptionStatus).toBe('cancelled');
      expect(updatedBusiness.stripeSubscriptionId).toBeNull();
      expect(updatedBusiness.subscriptionExpiry).toBeNull();
    });

    test('should reject cancellation if no subscription exists', async () => {
      testBusiness1.stripeSubscriptionId = null;
      await testBusiness1.save();

      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .set('Authorization', `Bearer ${testToken1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('no_subscription');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

