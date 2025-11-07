const request = require('supertest');
const app = require('../../src/app');

/**
 * Helper to register a test user
 */
const registerTestUser = async (userData = {}) => {
  const defaultUser = {
    email: 'test@example.com',
    password: 'test123',
    name: 'Test User',
    ...userData
  };

  const response = await request(app)
    .post('/api/auth/register')
    .send(defaultUser);

  return response;
};

/**
 * Helper to login and get token
 */
const loginTestUser = async (email = 'test@example.com', password = 'test123') => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  return response.body.data?.token || null;
};

/**
 * Helper to create authenticated request
 */
const authenticatedRequest = async (token) => {
  return request(app).set('Authorization', `Bearer ${token}`);
};

/**
 * Helper to upload a test file
 */
const uploadTestFile = async (token, filePath = null) => {
  const req = await authenticatedRequest(token);
  
  if (filePath) {
    return req.post('/api/media/upload').attach('file', filePath);
  }
  
  // Create a simple test file buffer
  const fs = require('fs');
  const path = require('path');
  const testFilePath = path.join(__dirname, '../fixtures/test-image.jpg');
  
  // If test file doesn't exist, create a dummy one
  if (!fs.existsSync(testFilePath)) {
    // Create a minimal valid JPEG (1x1 pixel)
    const minimalJpeg = Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A',
      'base64'
    );
    fs.writeFileSync(testFilePath, minimalJpeg);
  }
  
  return req.post('/api/media/upload').attach('file', testFilePath);
};

module.exports = {
  registerTestUser,
  loginTestUser,
  authenticatedRequest,
  uploadTestFile
};

