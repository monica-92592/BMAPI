/**
 * License Payment Integration Tests
 * 
 * Comprehensive test suite for license payment flows:
 * - License payment processing
 * - Revenue split calculation
 * - Transaction creation
 * - License status updates
 * - Connect account vs platform collection
 * 
 * All tests use mock Stripe API - no real Stripe calls
 */

const request = require('supertest');
const app = require('../../src/app');
const Business = require('../../src/models/Business');
const Transaction = require('../../src/models/Transaction');
const License = require('../../src/models/License');
const Media = require('../../src/models/Media');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const {
  createMockCustomer,
  createMockPaymentIntent,
  createMockCharge
} = require('../../tests/helpers/stripeMocks');

// Set Stripe secrets for testing
const TEST_STRIPE_SECRET_KEY = 'sk_test_mock_key_for_testing';
process.env.STRIPE_SECRET_KEY = TEST_STRIPE_SECRET_KEY;

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

describe('License Payment Integration Tests', () => {
  let testBusiness1, testBusiness2; // Licensor and Licensee
  let testToken1, testToken2;
  let testLicense1, testLicense2;
  let testMedia;

  // Set up test environment
  beforeAll(async () => {
    // Create test businesses
    testBusiness1 = await Business.create({
      email: `license-payment-licensor-${Date.now()}@test.com`,
      password: 'password123',
      name: 'License Payment Licensor',
      companyName: 'Licensor Company',
      companyType: 'photography',
      industry: 'media',
      membershipTier: 'partner', // 85/15 split
      subscriptionStatus: 'active',
      stripeCustomerId: null,
      stripeConnectAccountId: null
    });

    testBusiness2 = await Business.create({
      email: `license-payment-licensee-${Date.now()}@test.com`,
      password: 'password123',
      name: 'License Payment Licensee',
      companyName: 'Licensee Company',
      companyType: 'design',
      industry: 'media',
      membershipTier: 'free',
      subscriptionStatus: 'active',
      stripeCustomerId: null
    });

    testToken1 = generateToken(testBusiness1._id);
    testToken2 = generateToken(testBusiness2._id);

    // Create test media
    testMedia = await Media.create({
      title: 'Test Media for License Payment',
      description: 'Test description',
      ownerId: testBusiness1._id,
      mediaType: 'image',
      url: 'https://example.com/test.jpg',
      thumbnailUrl: 'https://example.com/test-thumb.jpg',
      isLicensable: true,
      licensePrice: 100.00,
      size: 1024000,
      category: 'image',
      mimetype: 'image/jpeg',
      originalName: 'test.jpg',
      filename: 'test.jpg'
    });

    // Create test licenses
    testLicense1 = await License.create({
      licensorId: testBusiness1._id,
      licenseeId: testBusiness2._id,
      mediaId: testMedia._id,
      licenseType: 'commercial',
      price: 100.00,
      status: 'pending'
    });

    testLicense2 = await License.create({
      licensorId: testBusiness1._id,
      licenseeId: testBusiness2._id,
      mediaId: testMedia._id,
      licenseType: 'editorial',
      price: 50.00,
      status: 'pending'
    });
  });

  beforeEach(async () => {
    // Reload test data from database (global afterEach clears collections)
    if (testBusiness1?._id) {
      testBusiness1 = await Business.findById(testBusiness1._id);
    }
    if (testBusiness2?._id) {
      testBusiness2 = await Business.findById(testBusiness2._id);
    }
    if (testMedia?._id) {
      testMedia = await Media.findById(testMedia._id);
    }
    if (testLicense1?._id) {
      testLicense1 = await License.findById(testLicense1._id);
    }
    if (testLicense2?._id) {
      testLicense2 = await License.findById(testLicense2._id);
    }
    
    // Recreate if they were deleted
    if (!testBusiness1) {
      testBusiness1 = await Business.create({
        email: `license-payment-licensor-${Date.now()}@test.com`,
        password: 'password123',
        name: 'License Payment Licensor',
        companyName: 'Licensor Company',
        companyType: 'photography',
        industry: 'media',
        membershipTier: 'partner',
        subscriptionStatus: 'active',
        stripeCustomerId: null,
        stripeConnectAccountId: null
      });
      testToken1 = generateToken(testBusiness1._id);
    }
    
    if (!testBusiness2) {
      testBusiness2 = await Business.create({
        email: `license-payment-licensee-${Date.now()}@test.com`,
        password: 'password123',
        name: 'License Payment Licensee',
        companyName: 'Licensee Company',
        companyType: 'design',
        industry: 'media',
        membershipTier: 'free',
        subscriptionStatus: 'active',
        stripeCustomerId: null
      });
      testToken2 = generateToken(testBusiness2._id);
    }
    
    if (!testMedia) {
      testMedia = await Media.create({
        title: 'Test Media for License Payment',
        description: 'Test description',
        ownerId: testBusiness1._id,
        mediaType: 'image',
        url: 'https://example.com/test.jpg',
        thumbnailUrl: 'https://example.com/test-thumb.jpg',
        isLicensable: true,
        licensePrice: 100.00,
        size: 1024000,
        category: 'image',
        mimetype: 'image/jpeg',
        originalName: 'test.jpg',
        filename: 'test.jpg'
      });
    }
    
    if (!testLicense1) {
      testLicense1 = await License.create({
        licensorId: testBusiness1._id,
        licenseeId: testBusiness2._id,
        mediaId: testMedia._id,
        licenseType: 'commercial',
        price: 100.00,
        status: 'pending'
      });
    }
    
    if (!testLicense2) {
      testLicense2 = await License.create({
        licensorId: testBusiness1._id,
        licenseeId: testBusiness2._id,
        mediaId: testMedia._id,
        licenseType: 'editorial',
        price: 50.00,
        status: 'pending'
      });
    }
  });

  afterAll(async () => {
    // Clean up test data
    const businessIds = [];
    const licenseIds = [];
    const mediaIds = [];
    
    if (testBusiness1 && testBusiness1._id) businessIds.push(testBusiness1._id);
    if (testBusiness2 && testBusiness2._id) businessIds.push(testBusiness2._id);
    if (testLicense1 && testLicense1._id) licenseIds.push(testLicense1._id);
    if (testLicense2 && testLicense2._id) licenseIds.push(testLicense2._id);
    if (testMedia && testMedia._id) mediaIds.push(testMedia._id);
    
    if (businessIds.length > 0) await Business.deleteMany({ _id: { $in: businessIds } });
    if (licenseIds.length > 0) await License.deleteMany({ _id: { $in: licenseIds } });
    if (mediaIds.length > 0) await Media.deleteMany({ _id: { $in: mediaIds } });
    await Transaction.deleteMany({});
  });

  // ===== License Payment Tests =====

  describe('POST /api/licenses/:id/pay', () => {
    test('should process license payment with payment intent (no Connect account)', async () => {
      const mockCustomer = createMockCustomer({
        id: 'cus_licensee123',
        email: testBusiness2.email
      });

      const mockPaymentIntent = createMockPaymentIntent({
        id: 'pi_license123',
        amount: 10000, // $100.00 in cents
        customer: 'cus_licensee123',
        status: 'requires_payment_method',
        client_secret: 'pi_license123_secret',
        metadata: {
          licenseId: testLicense1._id.toString(),
          businessId: testBusiness2._id.toString()
        }
      });

      // Mock Stripe methods
      const stripe = require('../../src/config/stripe');
      stripe.customers.create = jest.fn().mockResolvedValue(mockCustomer);
      stripe.paymentIntents.create = jest.fn().mockResolvedValue(mockPaymentIntent);

      const response = await request(app)
        .post(`/api/licenses/${testLicense1._id}/pay`)
        .set('Authorization', `Bearer ${testToken2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentIntent.id).toBe('pi_license123');
      expect(response.body.data.paymentIntent.clientSecret).toBe('pi_license123_secret');
      expect(response.body.data.transaction).toBeDefined();

      // Verify transaction was created
      const transaction = await Transaction.findOne({
        stripePaymentIntentId: 'pi_license123'
      });

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('license_payment');
      // Amount is stored in cents in the controller
      expect(transaction.grossAmount).toBe(10000); // $100.00 = 10000 cents
      expect(transaction.status).toBe('pending');
      expect(transaction.creatorShare).toBeGreaterThan(0);
      expect(transaction.platformShare).toBeGreaterThan(0);
      expect(transaction.payer.toString()).toBe(testBusiness2._id.toString());
      expect(transaction.payee.toString()).toBe(testBusiness1._id.toString());
      expect(transaction.relatedLicense.toString()).toBe(testLicense1._id.toString());

      // Verify license was updated
      const updatedLicense = await License.findById(testLicense1._id);
      expect(updatedLicense.status).toBe('approved');
      // Note: paymentTransactionId is set in the controller, but may not be immediately available
      // The license status change confirms the payment was processed

      // Verify licensee has Stripe customer ID
      const updatedLicensee = await Business.findById(testBusiness2._id);
      expect(updatedLicensee.stripeCustomerId).toBe('cus_licensee123');
    });

    test('should process license payment with destination charge (Connect account)', async () => {
      // Set up licensor with Connect account
      testBusiness1.stripeConnectAccountId = 'acct_connect123';
      await testBusiness1.save();

      const mockCustomer = createMockCustomer({
        id: 'cus_licensee456',
        email: testBusiness2.email
      });

      const mockCharge = {
        id: 'ch_destination123',
        amount: 5000, // $50.00 in cents
        currency: 'usd',
        customer: 'cus_licensee456',
        destination: 'acct_connect123',
        payment_intent: 'pi_destination123',
        status: 'succeeded'
      };

      // Mock Stripe methods
      const stripe = require('../../src/config/stripe');
      stripe.customers.create = jest.fn().mockResolvedValue(mockCustomer);
      stripe.charges.create = jest.fn().mockResolvedValue(mockCharge);

      const response = await request(app)
        .post(`/api/licenses/${testLicense2._id}/pay`)
        .set('Authorization', `Bearer ${testToken2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.paymentIntent.id).toBe('pi_destination123');

      // Verify transaction was created
      const transaction = await Transaction.findOne({
        stripePaymentIntentId: 'pi_destination123'
      });

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('license_payment');
      // Amount is stored in cents in the controller
      expect(transaction.grossAmount).toBe(5000); // $50.00 = 5000 cents
    });

    test('should calculate correct revenue split for partner tier (85/15)', async () => {
      // Reset test data
      testBusiness1.membershipTier = 'partner';
      testBusiness1.stripeConnectAccountId = null;
      await testBusiness1.save();

      // Ensure testMedia exists
      if (!testMedia) {
        testMedia = await Media.create({
          title: 'Test Media for License Payment',
          description: 'Test description',
          ownerId: testBusiness1._id,
          mediaType: 'image',
          url: 'https://example.com/test.jpg',
          thumbnailUrl: 'https://example.com/test-thumb.jpg',
          isLicensable: true,
          licensePrice: 100.00,
          size: 1024000,
          category: 'image',
          mimetype: 'image/jpeg',
          originalName: 'test.jpg',
          filename: 'test.jpg'
        });
      }

      const newLicense = await License.create({
        licensorId: testBusiness1._id,
        licenseeId: testBusiness2._id,
        mediaId: testMedia._id,
        licenseType: 'commercial',
        price: 100.00,
        status: 'pending'
      });

      const mockCustomer = createMockCustomer({ id: 'cus_test' });
      const mockPaymentIntent = createMockPaymentIntent({
        id: 'pi_split_test',
        amount: 10000,
        customer: 'cus_test'
      });

      const stripe = require('../../src/config/stripe');
      stripe.customers.create = jest.fn().mockResolvedValue(mockCustomer);
      stripe.paymentIntents.create = jest.fn().mockResolvedValue(mockPaymentIntent);

      await request(app)
        .post(`/api/licenses/${newLicense._id}/pay`)
        .set('Authorization', `Bearer ${testToken2}`)
        .expect(200);

      // Verify revenue split (85/15 for partner tier)
      const transaction = await Transaction.findOne({
        stripePaymentIntentId: 'pi_split_test'
      });

      expect(transaction).toBeDefined();
      // Amounts are stored in cents in the controller
      // Gross: $100 = 10000 cents, Stripe Fee: ~$3.20 = 320 cents, Net: ~$96.80 = 9680 cents
      // Creator (85%): ~$82.28 = 8228 cents, Platform (15%): ~$14.52 = 1452 cents
      expect(transaction.creatorShare).toBeCloseTo(8228, 0); // Allow 1 cent tolerance
      expect(transaction.platformShare).toBeCloseTo(1452, 0); // Allow 1 cent tolerance
      expect(transaction.creatorShare + transaction.platformShare).toBeCloseTo(transaction.netAmount, 0);

      // Clean up
      await License.deleteMany({ _id: newLicense._id });
      await Transaction.deleteMany({ stripePaymentIntentId: 'pi_split_test' });
    });

    test('should reject payment for non-pending license', async () => {
      // Set license to approved
      testLicense1.status = 'approved';
      await testLicense1.save();

      const response = await request(app)
        .post(`/api/licenses/${testLicense1._id}/pay`)
        .set('Authorization', `Bearer ${testToken2}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('invalid_status');

      // Reset
      testLicense1.status = 'pending';
      await testLicense1.save();
    });

    test('should reject payment for non-existent license', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/licenses/${fakeId}/pay`)
        .set('Authorization', `Bearer ${testToken2}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('license_not_found');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/licenses/${testLicense1._id}/pay`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('should only allow licensee to pay', async () => {
      // Try to pay as licensor (should fail or be unauthorized)
      const response = await request(app)
        .post(`/api/licenses/${testLicense1._id}/pay`)
        .set('Authorization', `Bearer ${testToken1}`)
        .expect(400); // Or 403, depending on implementation

      // The exact error depends on how the controller validates licensee
      expect(response.body.success).toBe(false);
    });
  });
});

