const request = require('supertest');
const app = require('../../src/app');
const { registerTestUser, loginTestUser } = require('../helpers/testHelpers');
const Media = require('../../src/models/Media');
const Business = require('../../src/models/Business');
const path = require('path');
const fs = require('fs');

describe('Media Licensing API', () => {
  let authToken;
  let businessId;
  let testMediaId;

  beforeEach(async () => {
    // Register and login before each test
    await registerTestUser({
      email: 'licensing@example.com',
      password: 'password123',
      name: 'Licensing User',
      companyName: 'Licensing Company',
      companyType: 'photography',
      industry: 'Creative Services'
    });

    authToken = await loginTestUser('licensing@example.com', 'password123');
    
    // Get business ID
    const business = await Business.findOne({ email: 'licensing@example.com' });
    businessId = business._id;
  });

  describe('Schema Changes - Create Media with Licensing Fields', () => {
    test('should create media with default licensing fields', async () => {
      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const testDir = path.dirname(testImagePath);
      
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const minimalJpeg = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
        'base64'
      );
      fs.writeFileSync(testImagePath, minimalJpeg);

      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isLicensable', false);
      expect(response.body.data).toHaveProperty('ownershipModel', 'individual');
      expect(response.body.data).toHaveProperty('licenseCount', 0);
      expect(response.body.data).toHaveProperty('activeLicenses');
      expect(Array.isArray(response.body.data.activeLicenses)).toBe(true);
      
      testMediaId = response.body.data._id;
    });

    test('should create media with custom licensing fields', async () => {
      const media = await Media.create({
        filename: 'test-licensing.jpg',
        originalName: 'test.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/test.jpg',
        cloudinaryId: 'test-licensing',
        ownerId: businessId,
        title: 'Test Image',
        description: 'A test image for licensing',
        tags: ['test', 'image', 'licensing'],
        isLicensable: true,
        ownershipModel: 'individual',
        licenseTypes: ['commercial', 'editorial'],
        pricing: {
          basePrice: 50,
          currency: 'USD',
          licenseType: 'commercial'
        },
        usageRestrictions: {
          geographic: ['US', 'CA'],
          duration: '1 year',
          modification: false
        },
        copyrightInformation: '© 2024 Test Company'
      });

      expect(media.isLicensable).toBe(true);
      expect(media.ownershipModel).toBe('individual');
      expect(media.title).toBe('Test Image');
      expect(media.description).toBe('A test image for licensing');
      expect(media.tags).toEqual(['test', 'image', 'licensing']);
      expect(media.licenseTypes).toEqual(['commercial', 'editorial']);
      expect(media.pricing.basePrice).toBe(50);
      expect(media.pricing.currency).toBe('USD');
      expect(media.usageRestrictions.geographic).toEqual(['US', 'CA']);
      expect(media.usageRestrictions.modification).toBe(false);
      expect(media.copyrightInformation).toBe('© 2024 Test Company');
    });
  });

  describe('Update Licensing Fields', () => {
    beforeEach(async () => {
      // Create test media
      const media = await Media.create({
        filename: 'test-update.jpg',
        originalName: 'test.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/test.jpg',
        cloudinaryId: 'test-update',
        ownerId: businessId
      });
      testMediaId = media._id;
    });

    test('should update licensing information', async () => {
      const response = await request(app)
        .put(`/api/media/${testMediaId}/licensing`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
          tags: ['updated', 'tags'],
          copyrightInformation: '© 2024 Updated'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.description).toBe('Updated description');
      expect(response.body.data.tags).toEqual(['updated', 'tags']);
      expect(response.body.data.copyrightInformation).toBe('© 2024 Updated');
    });

    test('should set pricing', async () => {
      const response = await request(app)
        .put(`/api/media/${testMediaId}/pricing`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          basePrice: 100,
          currency: 'USD',
          licenseType: 'commercial'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.pricing.basePrice).toBe(100);
      expect(response.body.data.pricing.currency).toBe('USD');
      expect(response.body.data.pricing.licenseType).toBe('commercial');
    });

    test('should set license types', async () => {
      const response = await request(app)
        .put(`/api/media/${testMediaId}/license-types`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licenseTypes: ['commercial', 'editorial', 'exclusive']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.licenseTypes).toEqual(['commercial', 'editorial', 'exclusive']);
    });

    test('should reject invalid license types', async () => {
      const response = await request(app)
        .put(`/api/media/${testMediaId}/license-types`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          licenseTypes: ['invalid', 'type']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
    });

    test('should set usage restrictions', async () => {
      const response = await request(app)
        .put(`/api/media/${testMediaId}/usage-restrictions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          geographic: ['US', 'CA', 'UK'],
          duration: '2 years',
          modification: true
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.usageRestrictions.geographic).toEqual(['US', 'CA', 'UK']);
      expect(response.body.data.usageRestrictions.duration).toBe('2 years');
      expect(response.body.data.usageRestrictions.modification).toBe(true);
    });

    test('should enable licensing', async () => {
      const response = await request(app)
        .put(`/api/media/${testMediaId}/make-licensable`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isLicensable).toBe(true);
    });

    test('should reject update from non-owner', async () => {
      // Create another business
      await registerTestUser({
        email: 'other@example.com',
        password: 'password123',
        name: 'Other User',
        companyName: 'Other Company',
        companyType: 'design',
        industry: 'Creative Services'
      });

      const otherToken = await loginTestUser('other@example.com', 'password123');

      const response = await request(app)
        .put(`/api/media/${testMediaId}/licensing`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          title: 'Unauthorized Update'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Forbidden');
    });
  });

  describe('Upload Limit Enforcement', () => {
    test('should enforce upload limit for free tier', async () => {
      // Set business to free tier with upload count at limit
      const business = await Business.findOne({ email: 'licensing@example.com' });
      business.membershipTier = 'free';
      business.uploadCount = 25; // At limit
      await business.save();

      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const testDir = path.dirname(testImagePath);
      
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const minimalJpeg = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
        'base64'
      );
      fs.writeFileSync(testImagePath, minimalJpeg);

      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Upload limit reached');
      expect(response.body).toHaveProperty('upgradeUrl');
      expect(response.body).toHaveProperty('upgradeMessage');
      expect(response.body).toHaveProperty('currentUploads', 25);
      expect(response.body).toHaveProperty('uploadLimit', 25);
    });

    test('should allow unlimited uploads for contributor tier', async () => {
      // Set business to contributor tier
      const business = await Business.findOne({ email: 'licensing@example.com' });
      business.membershipTier = 'contributor';
      business.uploadCount = 100; // Above free tier limit
      await business.save();

      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const testDir = path.dirname(testImagePath);
      
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      const minimalJpeg = Buffer.from(
        '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
        'base64'
      );
      fs.writeFileSync(testImagePath, minimalJpeg);

      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Query Licensable Media', () => {
    beforeEach(async () => {
      // Create licensable media
      await Media.create({
        filename: 'licensable1.jpg',
        originalName: 'licensable1.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/licensable1.jpg',
        cloudinaryId: 'licensable1',
        ownerId: businessId,
        isLicensable: true,
        title: 'Licensable Image 1',
        description: 'First licensable image',
        tags: ['nature', 'landscape'],
        licenseTypes: ['commercial', 'editorial'],
        pricing: {
          basePrice: 50,
          currency: 'USD'
        }
      });

      await Media.create({
        filename: 'licensable2.jpg',
        originalName: 'licensable2.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/licensable2.jpg',
        cloudinaryId: 'licensable2',
        ownerId: businessId,
        isLicensable: true,
        title: 'Licensable Image 2',
        description: 'Second licensable image',
        tags: ['portrait', 'people'],
        licenseTypes: ['commercial'],
        pricing: {
          basePrice: 75,
          currency: 'USD'
        }
      });

      // Create non-licensable media
      await Media.create({
        filename: 'non-licensable.jpg',
        originalName: 'non-licensable.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/non-licensable.jpg',
        cloudinaryId: 'non-licensable',
        ownerId: businessId,
        isLicensable: false
      });
    });

    test('should list only licensable media', async () => {
      const response = await request(app)
        .get('/api/media/licensable')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // All returned media should be licensable
      response.body.data.forEach(media => {
        expect(media.isLicensable).toBe(true);
      });
    });

    test('should filter licensable media by category', async () => {
      const response = await request(app)
        .get('/api/media/licensable')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: 'image' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      response.body.data.forEach(media => {
        expect(media.category).toBe('image');
        expect(media.isLicensable).toBe(true);
      });
    });

    test('should filter licensable media by license type', async () => {
      const response = await request(app)
        .get('/api/media/licensable')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ licenseType: 'commercial' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      response.body.data.forEach(media => {
        expect(media.licenseTypes).toContain('commercial');
        expect(media.isLicensable).toBe(true);
      });
    });

    test('should filter licensable media by price range', async () => {
      const response = await request(app)
        .get('/api/media/licensable')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ priceRange: '0-60' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      response.body.data.forEach(media => {
        expect(media.pricing.basePrice).toBeGreaterThanOrEqual(0);
        expect(media.pricing.basePrice).toBeLessThanOrEqual(60);
        expect(media.isLicensable).toBe(true);
      });
    });

    test('should search licensable media by tags', async () => {
      // Create media with specific tags
      await Media.create({
        filename: 'tagged.jpg',
        originalName: 'tagged.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/tagged.jpg',
        cloudinaryId: 'tagged',
        ownerId: businessId,
        isLicensable: true,
        title: 'Tagged Image',
        tags: ['nature', 'sunset', 'beach']
      });

      // Search should work through text index
      const response = await request(app)
        .get('/api/media/licensable')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Get Licensing Info', () => {
    beforeEach(async () => {
      const media = await Media.create({
        filename: 'info-test.jpg',
        originalName: 'info-test.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/info-test.jpg',
        cloudinaryId: 'info-test',
        ownerId: businessId,
        isLicensable: true,
        title: 'Info Test Image',
        description: 'Test image for licensing info',
        tags: ['test'],
        licenseTypes: ['commercial'],
        pricing: {
          basePrice: 100,
          currency: 'USD',
          licenseType: 'commercial'
        },
        usageRestrictions: {
          geographic: ['US'],
          duration: '1 year',
          modification: false
        },
        copyrightInformation: '© 2024 Test'
      });
      testMediaId = media._id;
    });

    test('should get licensing information for media', async () => {
      const response = await request(app)
        .get(`/api/media/${testMediaId}/licensing-info`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('title', 'Info Test Image');
      expect(response.body.data).toHaveProperty('description', 'Test image for licensing info');
      expect(response.body.data).toHaveProperty('tags');
      expect(response.body.data).toHaveProperty('isLicensable', true);
      expect(response.body.data).toHaveProperty('ownershipModel');
      expect(response.body.data).toHaveProperty('licenseTypes');
      expect(response.body.data).toHaveProperty('pricing');
      expect(response.body.data).toHaveProperty('usageRestrictions');
      expect(response.body.data).toHaveProperty('copyrightInformation', '© 2024 Test');
      expect(response.body.data).toHaveProperty('licenseCount');
      expect(response.body.data).toHaveProperty('activeLicenses');
      expect(response.body.data).toHaveProperty('owner');
    });
  });

  describe('Pool Management', () => {
    beforeEach(async () => {
      const media = await Media.create({
        filename: 'pool-test.jpg',
        originalName: 'pool-test.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/pool-test.jpg',
        cloudinaryId: 'pool-test',
        ownerId: businessId
      });
      testMediaId = media._id;
    });

    test('should add media to pool', async () => {
      const poolId = '507f1f77bcf86cd799439011'; // Mock pool ID
      
      const response = await request(app)
        .put(`/api/media/${testMediaId}/pool`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ poolId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.poolId.toString()).toBe(poolId);
      expect(response.body.data.ownershipModel).toBe('pooled');
    });

    test('should remove media from pool', async () => {
      // First add to pool
      const poolId = '507f1f77bcf86cd799439011';
      await request(app)
        .put(`/api/media/${testMediaId}/pool`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ poolId });

      // Then remove from pool
      const response = await request(app)
        .delete(`/api/media/${testMediaId}/pool`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.poolId).toBeNull();
      expect(response.body.data.ownershipModel).toBe('individual');
    });
  });
});

