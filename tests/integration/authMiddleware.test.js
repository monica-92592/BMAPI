const request = require('supertest');
const express = require('express');
const Business = require('../../src/models/Business');
const jwt = require('jsonwebtoken');
const {
  authenticate,
  requireContributorTier,
  requirePartnerTier,
  requireActiveSubscription,
  checkUploadLimit,
  checkDownloadLimit,
  checkActiveLicenseLimit
} = require('../../src/middlewares/auth');

// Create test app with middleware routes
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Test routes with middleware
  app.get('/test/contributor', authenticate, requireContributorTier, (req, res) => {
    res.json({ success: true, message: 'Contributor access granted' });
  });

  app.get('/test/partner', authenticate, requirePartnerTier, (req, res) => {
    res.json({ success: true, message: 'Partner access granted' });
  });

  app.get('/test/subscription', authenticate, requireActiveSubscription, (req, res) => {
    res.json({ success: true, message: 'Subscription active' });
  });

  app.post('/test/upload', authenticate, checkUploadLimit, (req, res) => {
    res.json({ success: true, message: 'Upload allowed' });
  });

  app.post('/test/download', authenticate, checkDownloadLimit, (req, res) => {
    res.json({ success: true, message: 'Download allowed' });
  });

  app.post('/test/license', authenticate, checkActiveLicenseLimit, (req, res) => {
    res.json({ success: true, message: 'License creation allowed' });
  });

  return app;
};

// Helper to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: '1h' }
  );
};

describe('Auth Middleware', () => {
  let testApp;
  let freeBusiness;
  let contributorBusiness;
  let partnerBusiness;
  let expiredBusiness;
  let freeToken;
  let contributorToken;
  let partnerToken;
  let expiredToken;

  beforeAll(() => {
    testApp = createTestApp();
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
      lastDownloadReset: new Date()
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
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      uploadCount: 0,
      downloadCount: 0,
      activeLicenseCount: 0,
      lastDownloadReset: new Date()
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
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      uploadCount: 0,
      downloadCount: 0,
      activeLicenseCount: 0,
      lastDownloadReset: new Date()
    });

    expiredBusiness = await Business.create({
      email: `expired-${Date.now()}@test.com`,
      password: 'password123',
      name: 'Expired User',
      companyName: 'Expired Company',
      companyType: 'other',
      industry: 'Technology',
      membershipTier: 'contributor',
      subscriptionStatus: 'active',
      subscriptionStart: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      subscriptionExpiry: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (expired)
      uploadCount: 0,
      downloadCount: 0,
      activeLicenseCount: 0,
      lastDownloadReset: new Date()
    });

    // Generate tokens
    freeToken = generateToken(freeBusiness._id);
    contributorToken = generateToken(contributorBusiness._id);
    partnerToken = generateToken(partnerBusiness._id);
    expiredToken = generateToken(expiredBusiness._id);
  });

  afterEach(async () => {
    await Business.deleteMany({});
  });

  describe('Tier Checks', () => {
    test('should reject free tier accessing contributor features', async () => {
      const response = await request(testApp)
        .get('/test/contributor')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient membership tier');
      expect(response.body.message).toBe('This feature requires Contributor membership ($15/month)');
      expect(response.body.currentTier).toBe('free');
      expect(response.body.requiredTier).toContain('contributor');
      expect(response.body.upgradeUrl).toBe('/api/subscriptions/upgrade');
    });

    test('should allow contributor accessing contributor features', async () => {
      const response = await request(testApp)
        .get('/test/contributor')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Contributor access granted');
    });

    test('should reject contributor accessing partner features', async () => {
      const response = await request(testApp)
        .get('/test/partner')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(403);

      expect(response.body.error).toBe('Insufficient membership tier');
      expect(response.body.message).toBe('This feature requires Partner membership ($50/month)');
      expect(response.body.currentTier).toBe('contributor');
      expect(response.body.requiredTier).toContain('partner');
      expect(response.body.upgradeUrl).toBe('/api/subscriptions/upgrade');
    });

    test('should allow partner accessing partner features', async () => {
      const response = await request(testApp)
        .get('/test/partner')
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Partner access granted');
    });
  });

  describe('Subscription Checks', () => {
    test('should allow free tier without subscription', async () => {
      const response = await request(testApp)
        .get('/test/subscription')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription active');
    });

    test('should allow active subscription', async () => {
      const response = await request(testApp)
        .get('/test/subscription')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription active');
    });

    test('should reject expired subscription', async () => {
      const response = await request(testApp)
        .get('/test/subscription')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(403);

      expect(response.body.error).toBe('Subscription expired');
      expect(response.body.message).toBe('Your subscription has expired');
    });
  });

  describe('Limit Enforcement (Refined Model)', () => {
    test('should enforce upload limit for free tier', async () => {
      // Set upload count to limit (25)
      freeBusiness.uploadCount = 25;
      await freeBusiness.save();

      const response = await request(testApp)
        .post('/test/upload')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(403);

      expect(response.body.error).toBe('Upload limit reached');
      expect(response.body.message).toBe('Upload limit reached. Upgrade to Contributor for unlimited uploads.');
      expect(response.body.currentUploads).toBe(25);
      expect(response.body.uploadLimit).toBe(25);
      expect(response.body.upgradeUrl).toBe('/api/subscriptions/upgrade');
    });

    test('should allow uploads below limit for free tier', async () => {
      freeBusiness.uploadCount = 24;
      await freeBusiness.save();

      const response = await request(testApp)
        .post('/test/upload')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Upload allowed');
    });

    test('should allow unlimited uploads for contributor tier', async () => {
      contributorBusiness.uploadCount = 1000;
      await contributorBusiness.save();

      const response = await request(testApp)
        .post('/test/upload')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Upload allowed');
    });

    test('should enforce download limit for free tier', async () => {
      // Set download count to limit (50)
      freeBusiness.downloadCount = 50;
      await freeBusiness.save();

      const response = await request(testApp)
        .post('/test/download')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(403);

      expect(response.body.error).toBe('Download limit reached');
      expect(response.body.message).toBe('Download limit reached (50/month). Upgrade to Contributor for unlimited downloads.');
      expect(response.body.currentDownloads).toBe(50);
      expect(response.body.downloadLimit).toBe(50);
      expect(response.body.upgradeUrl).toBe('/api/subscriptions/upgrade');
    });

    test('should allow downloads below limit for free tier', async () => {
      freeBusiness.downloadCount = 49;
      await freeBusiness.save();

      const response = await request(testApp)
        .post('/test/download')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Download allowed');
    });

    test('should allow unlimited downloads for contributor tier', async () => {
      contributorBusiness.downloadCount = 1000;
      await contributorBusiness.save();

      const response = await request(testApp)
        .post('/test/download')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Download allowed');
    });

    test('should enforce active license limit for free tier', async () => {
      // Set active license count to limit (3)
      freeBusiness.activeLicenseCount = 3;
      await freeBusiness.save();

      const response = await request(testApp)
        .post('/test/license')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(403);

      expect(response.body.error).toBe('Active license limit reached');
      expect(response.body.message).toBe('Active license limit reached (3 active). Upgrade to Contributor for unlimited active licenses.');
      expect(response.body.currentActiveLicenses).toBe(3);
      expect(response.body.activeLicenseLimit).toBe(3);
      expect(response.body.upgradeUrl).toBe('/api/subscriptions/upgrade');
    });

    test('should allow active licenses below limit for free tier', async () => {
      freeBusiness.activeLicenseCount = 2;
      await freeBusiness.save();

      const response = await request(testApp)
        .post('/test/license')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('License creation allowed');
    });

    test('should allow unlimited active licenses for contributor tier', async () => {
      contributorBusiness.activeLicenseCount = 1000;
      await contributorBusiness.save();

      const response = await request(testApp)
        .post('/test/license')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('License creation allowed');
    });

    test('should reset download count monthly', async () => {
      // Set last reset to 2 months ago
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      
      freeBusiness.downloadCount = 50;
      freeBusiness.lastDownloadReset = twoMonthsAgo;
      await freeBusiness.save();

      // Call download endpoint which should reset
      const response = await request(testApp)
        .post('/test/download')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify reset was performed
      const updatedBusiness = await Business.findById(freeBusiness._id);
      expect(updatedBusiness.downloadCount).toBe(0);
      expect(updatedBusiness.lastDownloadReset).toBeInstanceOf(Date);
    });
  });

  describe('Middleware Combinations', () => {
    test('should work with authenticate + requireContributorTier', async () => {
      const response = await request(testApp)
        .get('/test/contributor')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should work with authenticate + requireActiveSubscription', async () => {
      const response = await request(testApp)
        .get('/test/subscription')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should work with authenticate + checkUploadLimit', async () => {
      const response = await request(testApp)
        .post('/test/upload')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should work with authenticate + checkDownloadLimit', async () => {
      const response = await request(testApp)
        .post('/test/download')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should work with authenticate + checkActiveLicenseLimit', async () => {
      const response = await request(testApp)
        .post('/test/license')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Responses', () => {
    test('should return 403 status code for tier restrictions', async () => {
      const response = await request(testApp)
        .get('/test/contributor')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(403);

      expect(response.status).toBe(403);
    });

    test('should include upgrade URL in error responses', async () => {
      const response = await request(testApp)
        .get('/test/contributor')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(403);

      expect(response.body.upgradeUrl).toBe('/api/subscriptions/upgrade');
    });

    test('should return correct error message for contributor tier requirement', async () => {
      const response = await request(testApp)
        .get('/test/contributor')
        .set('Authorization', `Bearer ${freeToken}`)
        .expect(403);

      expect(response.body.message).toBe('This feature requires Contributor membership ($15/month)');
    });

    test('should return correct error message for partner tier requirement', async () => {
      const response = await request(testApp)
        .get('/test/partner')
        .set('Authorization', `Bearer ${contributorToken}`)
        .expect(403);

      expect(response.body.message).toBe('This feature requires Partner membership ($50/month)');
    });
  });
});
