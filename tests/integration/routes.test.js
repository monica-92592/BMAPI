const request = require('supertest');
const app = require('../../src/app');
const Business = require('../../src/models/Business');
const Media = require('../../src/models/Media');
const License = require('../../src/models/License');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// Helper to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1h' }
  );
};

// Helper to create a minimal test image
const createTestImage = () => {
  const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
  if (!fs.existsSync(testImagePath)) {
    const minimalJpeg = Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
      'base64'
    );
    fs.writeFileSync(testImagePath, minimalJpeg);
  }
  return testImagePath;
};

describe('Route Creation and Protection Tests', () => {
  let freeBusiness;
  let contributorBusiness;
  let partnerBusiness;
  let unverifiedBusiness;
  let freeToken;
  let contributorToken;
  let partnerToken;
  let unverifiedToken;
  let licensableMedia;
  let testImagePath;

  beforeAll(() => {
    testImagePath = createTestImage();
  });

  beforeEach(async () => {
    // Create test businesses with different tiers
    freeBusiness = await Business.create({
      email: `free-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Free User',
      companyName: 'Free Company',
      companyType: 'other',
      industry: 'Technology',
      membershipTier: 'free',
      subscriptionStatus: 'active',
      uploadCount: 0,
      downloadCount: 0,
      activeLicenseCount: 0,
      lastDownloadReset: new Date(),
      isVerified: true
    });

    contributorBusiness = await Business.create({
      email: `contributor-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Contributor User',
      companyName: 'Contributor Company',
      companyType: 'other',
      industry: 'Technology',
      membershipTier: 'contributor',
      subscriptionStatus: 'active',
      subscriptionStart: new Date(),
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      uploadCount: 0,
      downloadCount: 0,
      activeLicenseCount: 0,
      lastDownloadReset: new Date(),
      isVerified: true
    });

    partnerBusiness = await Business.create({
      email: `partner-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Partner User',
      companyName: 'Partner Company',
      companyType: 'other',
      industry: 'Technology',
      membershipTier: 'partner',
      subscriptionStatus: 'active',
      subscriptionStart: new Date(),
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      uploadCount: 0,
      downloadCount: 0,
      activeLicenseCount: 0,
      lastDownloadReset: new Date(),
      isVerified: true
    });

    unverifiedBusiness = await Business.create({
      email: `unverified-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Unverified User',
      companyName: 'Unverified Company',
      companyType: 'other',
      industry: 'Technology',
      membershipTier: 'free',
      subscriptionStatus: 'active',
      uploadCount: 0,
      downloadCount: 0,
      activeLicenseCount: 0,
      lastDownloadReset: new Date(),
      isVerified: false
    });

    // Create licensable media
    licensableMedia = await Media.create({
      filename: 'test-media.jpg',
      originalName: 'test-media.jpg',
      mimetype: 'image/jpeg',
      category: 'image',
      size: 1024,
      url: 'https://example.com/test-media.jpg',
      ownerId: partnerBusiness._id,
      isLicensable: true,
      licenseTypes: ['commercial', 'editorial'],
      pricing: {
        basePrice: 100,
        currency: 'USD'
      }
    });

    // Generate tokens
    freeToken = generateToken(freeBusiness._id);
    contributorToken = generateToken(contributorBusiness._id);
    partnerToken = generateToken(partnerBusiness._id);
    unverifiedToken = generateToken(unverifiedBusiness._id);
  });

  afterEach(async () => {
    await Business.deleteMany({});
    await Media.deleteMany({});
    await License.deleteMany({});
  });

  describe('1. Route Creation', () => {
    test('should create license request with download limit check', async () => {
      const response = await request(app)
        .post('/api/licenses')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          mediaId: licensableMedia._id,
          licenseType: 'commercial',
          terms: {
            duration: '1 year',
            geographic: ['US'],
            modification: false
          },
          price: 100
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('pending');
      expect(response.body.data.licenseType).toBe('commercial');

      // Verify download count was incremented
      const updatedBusiness = await Business.findById(freeBusiness._id);
      expect(updatedBusiness.downloadCount).toBe(1);
    });

    test('should approve license with active license limit check', async () => {
      // Create a pending license
      const license = await License.create({
        mediaId: licensableMedia._id,
        licensorId: partnerBusiness._id,
        licenseeId: freeBusiness._id,
        licenseType: 'commercial',
        terms: { duration: '1 year' },
        price: 100,
        status: 'pending'
      });

      const response = await request(app)
        .put(`/api/licenses/${license._id}/approve`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');

      // Verify active license count was incremented
      const updatedBusiness = await Business.findById(freeBusiness._id);
      expect(updatedBusiness.activeLicenseCount).toBe(1);
    });

    test('should reject license', async () => {
      // Create a pending license
      const license = await License.create({
        mediaId: licensableMedia._id,
        licensorId: partnerBusiness._id,
        licenseeId: freeBusiness._id,
        licenseType: 'commercial',
        terms: { duration: '1 year' },
        price: 100,
        status: 'pending'
      });

      const response = await request(app)
        .put(`/api/licenses/${license._id}/reject`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .send({ reason: 'Not suitable for our needs' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rejected');
      expect(response.body.data.rejectionReason).toBe('Not suitable for our needs');
    });

    test('should upload media with upload limit check', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${freeToken}`)
        .attach('file', testImagePath)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('filename');

      // Verify upload count was incremented
      const updatedBusiness = await Business.findById(freeBusiness._id);
      expect(updatedBusiness.uploadCount).toBe(1);
    });
  });

  describe('2. Route Protection', () => {
    test('should reject unauthenticated access', async () => {
      const response = await request(app)
        .post('/api/licenses')
        .send({
          mediaId: licensableMedia._id,
          licenseType: 'commercial'
        })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('should reject wrong tier access', async () => {
      const response = await request(app)
        .post('/api/collections')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          name: 'Test Collection',
          poolType: 'competitive'
        })
        .expect(403);

      expect(response.body.error).toBe('Insufficient membership tier');
      expect(response.body.message).toContain('Partner membership');
    });

    test('should reject unverified business access', async () => {
      const response = await request(app)
        .post('/api/licenses')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          mediaId: licensableMedia._id,
          licenseType: 'commercial'
        })
        .expect(403);

      expect(response.body.error).toBe('Business verification required');
    });

    test('should reject access when limit reached', async () => {
      // Set upload count to limit
      freeBusiness.uploadCount = 25;
      await freeBusiness.save();

      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${freeToken}`)
        .attach('file', testImagePath)
        .expect(403);

      expect(response.body.error).toBe('Upload limit reached');
      expect(response.body.message).toContain('Upgrade to Contributor');
    });
  });

  describe('3. Limit Enforcement', () => {
    test('should enforce upload limit', async () => {
      // Set upload count to limit
      freeBusiness.uploadCount = 25;
      await freeBusiness.save();

      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${freeToken}`)
        .attach('file', testImagePath)
        .expect(403);

      expect(response.body.error).toBe('Upload limit reached');
      expect(response.body.currentUploads).toBe(25);
      expect(response.body.uploadLimit).toBe(25);
    });

    test('should enforce download limit', async () => {
      // Set download count to limit
      freeBusiness.downloadCount = 50;
      await freeBusiness.save();

      const response = await request(app)
        .post('/api/licenses')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          mediaId: licensableMedia._id,
          licenseType: 'commercial'
        })
        .expect(403);

      expect(response.body.error).toBe('Download limit reached');
      expect(response.body.currentDownloads).toBe(50);
      expect(response.body.downloadLimit).toBe(50);
    });

    test('should enforce active license limit', async () => {
      // Set active license count to limit
      freeBusiness.activeLicenseCount = 3;
      await freeBusiness.save();

      // Create a pending license
      const license = await License.create({
        mediaId: licensableMedia._id,
        licensorId: partnerBusiness._id,
        licenseeId: freeBusiness._id,
        licenseType: 'commercial',
        terms: { duration: '1 year' },
        price: 100,
        status: 'pending'
      });

      const response = await request(app)
        .put(`/api/licenses/${license._id}/approve`)
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(403);

      expect(response.body.error).toBe('Active license limit reached');
      expect(response.body.currentActiveLicenses).toBe(3);
      expect(response.body.activeLicenseLimit).toBe(3);
    });

    test('should reset download count monthly', async () => {
      // Set last reset to 2 months ago
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      freeBusiness.downloadCount = 50;
      freeBusiness.lastDownloadReset = twoMonthsAgo;
      await freeBusiness.save();

      // Create license request which should reset download count
      await request(app)
        .post('/api/licenses')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          mediaId: licensableMedia._id,
          licenseType: 'commercial'
        })
        .expect(201);

      // Verify download count was reset
      const updatedBusiness = await Business.findById(freeBusiness._id);
      expect(updatedBusiness.downloadCount).toBe(1); // Reset to 0, then incremented to 1
    });
  });

  describe('4. Subscription Routes', () => {
    test('should upgrade tier', async () => {
      const response = await request(app)
        .post('/api/subscriptions/upgrade')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          tier: 'contributor',
          paymentMethod: 'stripe',
          paymentToken: 'tok_test_123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tier).toBe('contributor');
      expect(response.body.data.tierName).toBe('Contributor');

      // Verify business tier was updated
      const updatedBusiness = await Business.findById(freeBusiness._id);
      expect(updatedBusiness.membershipTier).toBe('contributor');
      expect(updatedBusiness.subscriptionStatus).toBe('active');
    });

    test('should downgrade tier', async () => {
      const response = await request(app)
        .post('/api/subscriptions/downgrade')
        .set('Authorization', `Bearer ${contributorToken}`)
        .send({
          tier: 'free'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tier).toBe('free');

      // Verify business tier was updated
      const updatedBusiness = await Business.findById(contributorBusiness._id);
      expect(updatedBusiness.membershipTier).toBe('free');
      expect(updatedBusiness.subscriptionStatus).toBe('cancelled');
    });

    test('should get subscription status', async () => {
      const response = await request(app)
        .get('/api/subscriptions/status')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tier).toBe('contributor');
      expect(response.body.data.isActive).toBe(true);
      expect(response.body.data.limits).toBeDefined();
    });

    test('should cancel subscription', async () => {
      const response = await request(app)
        .post('/api/subscriptions/cancel')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tier).toBe('free');

      // Verify business tier was downgraded
      const updatedBusiness = await Business.findById(contributorBusiness._id);
      expect(updatedBusiness.membershipTier).toBe('free');
      expect(updatedBusiness.subscriptionStatus).toBe('cancelled');
    });
  });

  describe('5. Route Queries', () => {
    beforeEach(async () => {
      // Create test licenses
      await License.create([
        {
          mediaId: licensableMedia._id,
          licensorId: partnerBusiness._id,
          licenseeId: freeBusiness._id,
          licenseType: 'commercial',
          terms: { duration: '1 year' },
          price: 100,
          status: 'pending'
        },
        {
          mediaId: licensableMedia._id,
          licensorId: partnerBusiness._id,
          licenseeId: contributorBusiness._id,
          licenseType: 'editorial',
          terms: { duration: '6 months' },
          price: 50,
          status: 'active'
        },
        {
          mediaId: licensableMedia._id,
          licensorId: partnerBusiness._id,
          licenseeId: freeBusiness._id,
          licenseType: 'exclusive',
          terms: { duration: '2 years' },
          price: 200,
          status: 'rejected'
        }
      ]);
    });

    test('should list licenses with filters', async () => {
      // Test status filter
      const statusResponse = await request(app)
        .get('/api/licenses?status=pending')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.every(l => l.status === 'pending')).toBe(true);

      // Test type filter
      const typeResponse = await request(app)
        .get('/api/licenses?type=commercial')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(typeResponse.body.success).toBe(true);
      expect(typeResponse.body.data.every(l => l.licenseType === 'commercial')).toBe(true);

      // Test asLicensor filter
      const licensorResponse = await request(app)
        .get('/api/licenses?asLicensor=true')
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(200);

      expect(licensorResponse.body.success).toBe(true);
      expect(licensorResponse.body.data.every(l => l.licensorId._id.toString() === partnerBusiness._id.toString())).toBe(true);

      // Test asLicensee filter
      const licenseeResponse = await request(app)
        .get('/api/licenses?asLicensee=true')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(licenseeResponse.body.success).toBe(true);
      expect(licenseeResponse.body.data.every(l => l.licenseeId._id.toString() === freeBusiness._id.toString())).toBe(true);
    });

    test('should get license details', async () => {
      const license = await License.findOne({ status: 'pending' });

      const response = await request(app)
        .get(`/api/licenses/${license._id}`)
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id.toString()).toBe(license._id.toString());
      expect(response.body.data.mediaId).toBeDefined();
      expect(response.body.data.licensorId).toBeDefined();
      expect(response.body.data.licenseeId).toBeDefined();
    });

    test('should get business licenses', async () => {
      const response = await request(app)
        .get('/api/business/licenses')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.every(l => 
        l.licenseeId._id.toString() === freeBusiness._id.toString() ||
        l.licensorId._id.toString() === freeBusiness._id.toString()
      )).toBe(true);
    });

    test('should get business licenses with filters', async () => {
      // Test asLicensor filter
      const licensorResponse = await request(app)
        .get('/api/business/licenses?asLicensor=true&status=pending')
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(200);

      expect(licensorResponse.body.success).toBe(true);
      expect(licensorResponse.body.data.every(l => 
        l.licensorId._id.toString() === partnerBusiness._id.toString() &&
        l.status === 'pending'
      )).toBe(true);

      // Test asLicensee filter
      const licenseeResponse = await request(app)
        .get('/api/business/licenses?asLicensee=true&status=active')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(200);

      expect(licenseeResponse.body.success).toBe(true);
      expect(licenseeResponse.body.data.every(l => 
        l.licenseeId._id.toString() === contributorBusiness._id.toString() &&
        l.status === 'active'
      )).toBe(true);
    });

    test('should get limit usage', async () => {
      // Set some usage
      freeBusiness.uploadCount = 10;
      freeBusiness.downloadCount = 20;
      freeBusiness.activeLicenseCount = 2;
      await freeBusiness.save();

      const response = await request(app)
        .get('/api/business/limits')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tier).toBe('free');
      expect(response.body.data.uploadCount).toBe(10);
      expect(response.body.data.uploadLimit).toBe(25);
      expect(response.body.data.downloadCount).toBe(20);
      expect(response.body.data.downloadLimit).toBe(50);
      expect(response.body.data.activeLicenseCount).toBe(2);
      expect(response.body.data.activeLicenseLimit).toBe(3);
      expect(response.body.data.uploadUsage).toBeDefined();
      expect(response.body.data.downloadUsage).toBeDefined();
      expect(response.body.data.activeLicenseUsage).toBeDefined();
    });
  });
});

