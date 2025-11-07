const request = require('supertest');
const app = require('../../src/app');
const { registerTestUser, loginTestUser, uploadTestFile } = require('../helpers/testHelpers');
const Media = require('../../src/models/Media');
const path = require('path');
const fs = require('fs');

describe('Media API', () => {
  let authToken;

  beforeEach(async () => {
    // Register and login before each test
    await registerTestUser({
      email: 'media@example.com',
      password: 'password123',
      name: 'Media User'
    });

    authToken = await loginTestUser('media@example.com', 'password123');
  });

  describe('POST /api/media/upload', () => {
    test('should upload a file with valid token', async () => {
      // Create a minimal test image file
      const testImagePath = path.join(__dirname, '../fixtures/test-image.jpg');
      const testDir = path.dirname(testImagePath);
      
      // Create fixtures directory if it doesn't exist
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      // Create a minimal valid JPEG (1x1 pixel)
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
      expect(response.body.data).toHaveProperty('filename');
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data).toHaveProperty('category', 'image');
      expect(response.body.data).toHaveProperty('size');
      expect(response.body.data).toHaveProperty('thumbnailUrl');
    });

    test('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/media/upload');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });

    test('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No file uploaded');
    });
  });

  describe('GET /api/media', () => {
    test('should list files with pagination', async () => {
      // Upload a file first
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

      await request(app)
        .post('/api/media/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('file', testImagePath);

      const response = await request(app)
        .get('/api/media')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('limit', 10);
      expect(response.body.pagination).toHaveProperty('offset', 0);
    });

    test('should filter files by category', async () => {
      const response = await request(app)
        .get('/api/media')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ category: 'image' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/media');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/media/:id', () => {
    test('should get file by ID', async () => {
      // Create a test file in database
      const testFile = await Media.create({
        filename: 'test-file.jpg',
        originalName: 'test.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/test.jpg',
        gcsId: 'test-file.jpg'
      });

      const response = await request(app)
        .get(`/api/media/${testFile._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('filename', 'test-file.jpg');
      expect(response.body.data).toHaveProperty('_id', testFile._id.toString());
    });

    test('should return 404 for non-existent file', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/media/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/media/507f1f77bcf86cd799439011');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/media/:id', () => {
    test('should delete file by ID', async () => {
      // Create a test file in database
      const testFile = await Media.create({
        filename: 'test-delete.jpg',
        originalName: 'test.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/test.jpg',
        gcsId: 'test-delete.jpg'
      });

      const response = await request(app)
        .delete(`/api/media/${testFile._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('File deleted successfully');

      // Verify file is deleted from database
      const deletedFile = await Media.findById(testFile._id);
      expect(deletedFile).toBeNull();
    });

    test('should return 404 for non-existent file', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/media/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .delete('/api/media/507f1f77bcf86cd799439011');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/media/search', () => {
    test('should search files by name', async () => {
      // Create test files
      await Media.create({
        filename: 'photo1.jpg',
        originalName: 'photo1.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/photo1.jpg'
      });

      await Media.create({
        filename: 'photo2.jpg',
        originalName: 'photo2.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/photo2.jpg'
      });

      const response = await request(app)
        .get('/api/media/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'photo' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('pagination');
    });

    test('should reject search without query parameter', async () => {
      const response = await request(app)
        .get('/api/media/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing search query');
    });
  });

  describe('GET /api/media/stats', () => {
    test('should get file statistics', async () => {
      // Create test files
      await Media.create({
        filename: 'test1.jpg',
        originalName: 'test1.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 1024,
        url: 'https://example.com/test1.jpg'
      });

      await Media.create({
        filename: 'test2.jpg',
        originalName: 'test2.jpg',
        mimetype: 'image/jpeg',
        category: 'image',
        size: 2048,
        url: 'https://example.com/test2.jpg'
      });

      const response = await request(app)
        .get('/api/media/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalFiles');
      expect(response.body.data).toHaveProperty('totalSize');
      expect(response.body.data).toHaveProperty('totalSizeMB');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data.byCategory).toHaveProperty('image');
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/media/stats');

      expect(response.status).toBe(401);
    });
  });
});

