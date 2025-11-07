const request = require('supertest');
const app = require('../../src/app');

describe('Health Check API', () => {
  test('GET /health should return 200 and success message', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('Media API is running');
    expect(response.body).toHaveProperty('timestamp');
  });
});

