/**
 * Webhook Integration Tests
 * 
 * Comprehensive test suite for Stripe webhook handling:
 * - Webhook signature verification
 * - Each event handler (subscription, invoice, payment intent, account, dispute)
 * - Idempotency (duplicate events)
 * 
 * All tests use mock Stripe webhook events - no real Stripe calls
 */

const request = require('supertest');
const app = require('../../src/app');
const Business = require('../../src/models/Business');
const Transaction = require('../../src/models/Transaction');
const License = require('../../src/models/License');
const mongoose = require('mongoose');
const crypto = require('crypto');
const {
  createMockSubscription,
  createMockCustomer,
  createMockPaymentIntent,
  createMockConnectAccount,
  createMockWebhookEvent,
  simulateWebhookSignature
} = require('../../tests/helpers/stripeMocks');

// Set Stripe secrets for testing
// Note: For testing, we use a simple secret without whsec_ prefix
// The mock will handle the secret directly
const TEST_WEBHOOK_SECRET = 'test_secret_for_testing';
const TEST_STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing';

// Set environment variables before any imports
process.env.STRIPE_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY;

// Mock Stripe config to return a mock Stripe instance
jest.mock('../../src/config/stripe', () => {
  const Stripe = require('stripe');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
});

describe('Stripe Webhook Integration Tests', () => {
  let testBusiness1, testBusiness2;
  let testCustomerId, testSubscriptionId;
  let testLicense;

  // Set up test environment
  beforeAll(async () => {
    // Create test businesses
    testBusiness1 = await Business.create({
      email: `webhook-test-1-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Webhook Test Business 1',
      companyName: 'Webhook Test Company 1',
      companyType: 'photography',
      industry: 'media',
      membershipTier: 'free',
      subscriptionStatus: 'active',
      stripeCustomerId: null,
      stripeSubscriptionId: null
    });

    testBusiness2 = await Business.create({
      email: `webhook-test-2-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Webhook Test Business 2',
      companyName: 'Webhook Test Company 2',
      companyType: 'design',
      industry: 'media',
      membershipTier: 'partner',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: null
    });

    testCustomerId = 'cus_test123';
    testSubscriptionId = 'sub_test123';

    // Create test license
    testLicense = await License.create({
      licensorId: testBusiness1._id,
      licenseeId: testBusiness2._id,
      mediaId: new mongoose.Types.ObjectId(),
      licenseType: 'commercial',
      price: 100,
      status: 'pending'
    });
  });

  beforeEach(async () => {
    // Reload test data from database (global afterEach clears collections)
    testBusiness1 = await Business.findById(testBusiness1?._id);
    testBusiness2 = await Business.findById(testBusiness2?._id);
    testLicense = await License.findById(testLicense?._id);
    
    // Recreate if they were deleted
    if (!testBusiness1) {
      testBusiness1 = await Business.create({
        email: `webhook-test-1-${Date.now()}@test.com`,
        password: 'password123',
        name: 'Webhook Test Business 1',
        companyName: 'Webhook Test Company 1',
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
        email: `webhook-test-2-${Date.now()}@test.com`,
        password: 'password123',
        name: 'Webhook Test Business 2',
        companyName: 'Webhook Test Company 2',
        companyType: 'design',
        industry: 'media',
        membershipTier: 'partner',
        subscriptionStatus: 'active',
        stripeCustomerId: 'cus_test123',
        stripeSubscriptionId: null
      });
      testToken2 = generateToken(testBusiness2._id);
    }
    
    if (!testLicense) {
      testLicense = await License.create({
        licensorId: testBusiness1._id,
        licenseeId: testBusiness2._id,
        mediaId: new mongoose.Types.ObjectId(),
        licenseType: 'commercial',
        price: 100,
        status: 'pending'
      });
    }
  });

  afterAll(async () => {
    // Clean up test data
    const businessIds = [];
    const licenseIds = [];
    
    if (testBusiness1?._id) businessIds.push(testBusiness1._id);
    if (testBusiness2?._id) businessIds.push(testBusiness2._id);
    if (testLicense?._id) licenseIds.push(testLicense._id);
    
    if (businessIds.length > 0) await Business.deleteMany({ _id: { $in: businessIds } });
    if (licenseIds.length > 0) await License.deleteMany({ _id: { $in: licenseIds } });
    await Transaction.deleteMany({});
  });

  // ===== Webhook Signature Verification Tests =====

  describe('Webhook Signature Verification', () => {
    test('should verify valid webhook signature', async () => {
      const event = createMockWebhookEvent('customer.subscription.created', {
        object: createMockSubscription({
          id: testSubscriptionId,
          customer: testCustomerId,
          metadata: { businessId: testBusiness1._id.toString(), tier: 'contributor' }
        })
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });

    test('should reject invalid webhook signature', async () => {
      const event = createMockWebhookEvent('customer.subscription.created', {
        object: createMockSubscription()
      });

      const payload = JSON.stringify(event);
      const invalidSignature = 'invalid_signature';

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', invalidSignature)
        .send(payload)
        .expect(400);

      expect(response.text).toContain('Webhook Error');
    });

    test('should reject missing webhook signature', async () => {
      const event = createMockWebhookEvent('customer.subscription.created', {
        object: createMockSubscription()
      });

      const payload = JSON.stringify(event);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .send(payload)
        .expect(400);

      expect(response.text).toContain('Webhook Error');
    });
  });

  // ===== Subscription Event Handlers =====

  describe('Subscription Event Handlers', () => {
    test('should handle customer.subscription.created event', async () => {
      const subscription = createMockSubscription({
        id: testSubscriptionId,
        customer: testCustomerId,
        metadata: { businessId: testBusiness1._id.toString(), tier: 'contributor' },
        current_period_end: Math.floor(Date.now() / 1000) + 2592000 // 30 days
      });

      const event = createMockWebhookEvent('customer.subscription.created', {
        object: subscription
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify business was updated
      const updatedBusiness = await Business.findById(testBusiness1._id);
      expect(updatedBusiness.membershipTier).toBe('contributor');
      expect(updatedBusiness.subscriptionStatus).toBe('active');
      expect(updatedBusiness.stripeSubscriptionId).toBe(testSubscriptionId);
      expect(updatedBusiness.subscriptionExpiry).toBeDefined();
    });

    test('should handle customer.subscription.updated event', async () => {
      // Update business to have subscription
      testBusiness1.stripeSubscriptionId = testSubscriptionId;
      testBusiness1.membershipTier = 'contributor';
      await testBusiness1.save();

      const subscription = createMockSubscription({
        id: testSubscriptionId,
        customer: testCustomerId,
        metadata: { businessId: testBusiness1._id.toString(), tier: 'partner' },
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 2592000
      });

      const event = createMockWebhookEvent('customer.subscription.updated', {
        object: subscription
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify business was updated
      const updatedBusiness = await Business.findById(testBusiness1._id);
      expect(updatedBusiness.membershipTier).toBe('partner');
      expect(updatedBusiness.subscriptionStatus).toBe('active');
    });

    test('should handle customer.subscription.deleted event', async () => {
      // Set up business with subscription
      testBusiness1.membershipTier = 'contributor';
      testBusiness1.subscriptionStatus = 'active';
      testBusiness1.stripeSubscriptionId = testSubscriptionId;
      await testBusiness1.save();

      const subscription = createMockSubscription({
        id: testSubscriptionId,
        customer: testCustomerId,
        metadata: { businessId: testBusiness1._id.toString() },
        status: 'canceled'
      });

      const event = createMockWebhookEvent('customer.subscription.deleted', {
        object: subscription
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify business was downgraded
      const updatedBusiness = await Business.findById(testBusiness1._id);
      expect(updatedBusiness.membershipTier).toBe('free');
      expect(updatedBusiness.subscriptionStatus).toBe('cancelled');
      expect(updatedBusiness.stripeSubscriptionId).toBeNull();
      expect(updatedBusiness.subscriptionExpiry).toBeNull();
    });
  });

  // ===== Invoice Event Handlers =====

  describe('Invoice Event Handlers', () => {
    test('should handle invoice.payment_succeeded event', async () => {
      const invoice = {
        id: 'in_test123',
        customer: testCustomerId,
        amount_paid: 10000, // $100.00 in cents
        payment_intent: 'pi_test123',
        charge: 'ch_test123',
        period_end: Math.floor(Date.now() / 1000) + 2592000
      };

      const event = createMockWebhookEvent('invoice.payment_succeeded', {
        object: invoice
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify transaction was created
      const transaction = await Transaction.findOne({
        stripePaymentIntentId: 'pi_test123'
      });

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('subscription_payment');
      expect(transaction.grossAmount).toBe(100);
      expect(transaction.status).toBe('completed');
      expect(transaction.payer.toString()).toBe(testBusiness2._id.toString());

      // Verify business subscription expiry was updated
      const updatedBusiness = await Business.findById(testBusiness2._id);
      expect(updatedBusiness.subscriptionExpiry).toBeDefined();
    });

    test('should handle invoice.payment_failed event', async () => {
      const invoice = {
        id: 'in_test456',
        customer: testCustomerId,
        amount_due: 10000, // $100.00 in cents
        payment_intent: 'pi_test456'
      };

      const event = createMockWebhookEvent('invoice.payment_failed', {
        object: invoice
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify business status was updated
      const updatedBusiness = await Business.findById(testBusiness2._id);
      expect(updatedBusiness.subscriptionStatus).toBe('past_due');

      // Verify failed transaction was created
      const transaction = await Transaction.findOne({
        stripePaymentIntentId: 'pi_test456'
      });

      expect(transaction).toBeDefined();
      expect(transaction.status).toBe('failed');
    });
  });

  // ===== Payment Intent Event Handlers =====

  describe('Payment Intent Event Handlers', () => {
    test('should handle payment_intent.succeeded event for license payment', async () => {
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_license123',
        amount: 10000, // $100.00 in cents
        customer: testCustomerId,
        metadata: { licenseId: testLicense._id.toString() },
        latest_charge: 'ch_license123'
      });

      const event = createMockWebhookEvent('payment_intent.succeeded', {
        object: paymentIntent
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify transaction was created or updated
      const transaction = await Transaction.findOne({
        stripePaymentIntentId: 'pi_license123'
      });

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('license_payment');
      expect(transaction.status).toBe('completed');
      expect(transaction.relatedLicense.toString()).toBe(testLicense._id.toString());

      // Verify license was updated
      const updatedLicense = await License.findById(testLicense._id);
      expect(updatedLicense.status).toBe('approved');
      expect(updatedLicense.paymentTransactionId).toBeDefined();
    });

    test('should handle payment_intent.payment_failed event', async () => {
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_failed123',
        amount: 10000,
        customer: testCustomerId,
        metadata: { licenseId: testLicense._id.toString() },
        status: 'payment_failed'
      });

      const event = createMockWebhookEvent('payment_intent.payment_failed', {
        object: paymentIntent
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify transaction status was updated
      const transaction = await Transaction.findOne({
        stripePaymentIntentId: 'pi_failed123'
      });

      if (transaction) {
        expect(transaction.status).toBe('failed');
      }
    });
  });

  // ===== Connect Account Event Handlers =====

  describe('Connect Account Event Handlers', () => {
    test('should handle account.updated event', async () => {
      // Set up business with Connect account
      testBusiness1.stripeConnectAccountId = 'acct_test123';
      testBusiness1.stripeConnectStatus = 'pending';
      await testBusiness1.save();

      const account = createMockConnectAccount({
        id: 'acct_test123',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
        metadata: { businessId: testBusiness1._id.toString() }
      });

      const event = createMockWebhookEvent('account.updated', {
        object: account
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify business Connect status was updated
      const updatedBusiness = await Business.findById(testBusiness1._id);
      expect(updatedBusiness.stripeConnectStatus).toBe('active');
    });
  });

  // ===== Dispute Event Handlers =====

  describe('Dispute Event Handlers', () => {
    test('should handle charge.dispute.created event', async () => {
      // Create a completed transaction first
      const originalTransaction = await Transaction.create({
        type: 'license_payment',
        grossAmount: 100.00,
        stripeFee: 3.20,
        netAmount: 96.80,
        creatorShare: 77.44,
        platformShare: 19.36,
        status: 'completed',
        stripeChargeId: 'ch_dispute123',
        payer: testBusiness2._id,
        payee: testBusiness1._id,
        relatedLicense: testLicense._id,
        completedAt: new Date()
      });

      // Set up business balance
      testBusiness1.revenueBalance = 100.00;
      await testBusiness1.save();

      const dispute = {
        id: 'dp_test123',
        charge: 'ch_dispute123',
        amount: 10000, // $100.00 in cents
        reason: 'fraudulent'
      };

      const event = createMockWebhookEvent('charge.dispute.created', {
        object: dispute
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify original transaction was updated
      const updatedTransaction = await Transaction.findById(originalTransaction._id);
      expect(updatedTransaction.status).toBe('disputed');
      expect(updatedTransaction.disputedAt).toBeDefined();

      // Verify dispute transaction was created
      const disputeTransaction = await Transaction.findOne({
        type: 'chargeback',
        stripeChargeId: 'ch_dispute123'
      });

      expect(disputeTransaction).toBeDefined();
      expect(disputeTransaction.metadata.disputeId).toBe('dp_test123');

      // Verify business balance was adjusted
      const updatedBusiness = await Business.findById(testBusiness1._id);
      expect(updatedBusiness.revenueBalance).toBeLessThan(100.00);
    });
  });

  // ===== Idempotency Tests =====

  describe('Idempotency (Duplicate Events)', () => {
    test('should handle duplicate subscription.created events idempotently', async () => {
      // Reset business
      testBusiness1.membershipTier = 'free';
      testBusiness1.subscriptionStatus = 'active';
      testBusiness1.stripeSubscriptionId = null;
      await testBusiness1.save();

      const subscription = createMockSubscription({
        id: testSubscriptionId,
        customer: testCustomerId,
        metadata: { businessId: testBusiness1._id.toString(), tier: 'contributor' },
        current_period_end: Math.floor(Date.now() / 1000) + 2592000
      });

      const event = createMockWebhookEvent('customer.subscription.created', {
        object: subscription
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      // Send first event
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      const businessAfterFirst = await Business.findById(testBusiness1._id);
      const firstTier = businessAfterFirst.membershipTier;
      const firstSubscriptionId = businessAfterFirst.stripeSubscriptionId;

      // Send duplicate event
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify business state is the same (idempotent)
      const businessAfterSecond = await Business.findById(testBusiness1._id);
      expect(businessAfterSecond.membershipTier).toBe(firstTier);
      expect(businessAfterSecond.stripeSubscriptionId).toBe(firstSubscriptionId);
    });

    test('should handle duplicate invoice.payment_succeeded events idempotently', async () => {
      const invoice = {
        id: 'in_duplicate123',
        customer: testCustomerId,
        amount_paid: 10000,
        payment_intent: 'pi_duplicate123',
        charge: 'ch_duplicate123',
        period_end: Math.floor(Date.now() / 1000) + 2592000
      };

      const event = createMockWebhookEvent('invoice.payment_succeeded', {
        object: invoice
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      // Send first event
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      const firstTransactionCount = await Transaction.countDocuments({
        stripePaymentIntentId: 'pi_duplicate123'
      });

      // Send duplicate event
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify only one transaction exists (idempotent)
      const secondTransactionCount = await Transaction.countDocuments({
        stripePaymentIntentId: 'pi_duplicate123'
      });

      expect(secondTransactionCount).toBe(firstTransactionCount);
    });

    test('should handle duplicate payment_intent.succeeded events idempotently', async () => {
      const paymentIntent = createMockPaymentIntent({
        id: 'pi_idempotent123',
        amount: 10000,
        customer: testCustomerId,
        metadata: { licenseId: testLicense._id.toString() },
        latest_charge: 'ch_idempotent123'
      });

      const event = createMockWebhookEvent('payment_intent.succeeded', {
        object: paymentIntent
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      // Send first event
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      const firstTransaction = await Transaction.findOne({
        stripePaymentIntentId: 'pi_idempotent123'
      });

      // Send duplicate event
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      // Verify transaction was updated, not duplicated
      const transactions = await Transaction.find({
        stripePaymentIntentId: 'pi_idempotent123'
      });

      expect(transactions.length).toBe(1);
      expect(transactions[0]._id.toString()).toBe(firstTransaction._id.toString());
    });
  });

  // ===== Error Handling Tests =====

  describe('Error Handling', () => {
    test('should handle unhandled event types gracefully', async () => {
      const event = createMockWebhookEvent('unknown.event.type', {
        object: {}
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });

    test('should handle events with missing businessId gracefully', async () => {
      const subscription = createMockSubscription({
        id: testSubscriptionId,
        customer: testCustomerId,
        metadata: {} // No businessId
      });

      const event = createMockWebhookEvent('customer.subscription.created', {
        object: subscription
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });

    test('should handle events with non-existent business gracefully', async () => {
      const subscription = createMockSubscription({
        id: testSubscriptionId,
        customer: testCustomerId,
        metadata: { businessId: new mongoose.Types.ObjectId().toString() }
      });

      const event = createMockWebhookEvent('customer.subscription.created', {
        object: subscription
      });

      const payload = JSON.stringify(event);
      const signature = simulateWebhookSignature(payload, TEST_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', signature)
        .send(payload)
        .expect(200);

      expect(response.body).toEqual({ received: true });
    });
  });
});

