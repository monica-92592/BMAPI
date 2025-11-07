# Testing Guide

This directory contains all tests for the Media API.

## Test Structure

```
tests/
├── setup.js                    # Test setup and teardown
├── helpers/
│   └── testHelpers.js         # Reusable test helper functions
├── integration/                # Integration tests (API endpoints)
│   ├── auth.test.js           # Authentication tests
│   ├── media.test.js          # Media API tests
│   └── health.test.js         # Health check tests
└── unit/                      # Unit tests (individual functions)
    └── utils/
        └── fileValidation.test.js  # File validation tests
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (auto-rerun on file changes)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

## Test Environment

- **Database**: Uses MongoDB Memory Server (in-memory database)
- **Isolation**: Each test runs in isolation with a clean database
- **No external dependencies**: Tests don't require Cloudinary or external services

## Writing New Tests

### Integration Test Example
```javascript
const request = require('supertest');
const app = require('../../src/app');

describe('My API Endpoint', () => {
  test('should do something', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Using Test Helpers
```javascript
const { registerTestUser, loginTestUser } = require('../helpers/testHelpers');

// Register a test user
await registerTestUser({
  email: 'test@example.com',
  password: 'test123',
  name: 'Test User'
});

// Login and get token
const token = await loginTestUser('test@example.com', 'test123');
```

## Test Coverage

Current test coverage includes:
- ✅ Authentication (register, login, get me)
- ✅ Media upload (with authentication)
- ✅ Media retrieval (list, get by ID, search)
- ✅ Media deletion
- ✅ File statistics
- ✅ Health check
- ✅ File validation utilities

## Notes

- Tests use an in-memory MongoDB instance (no real database needed)
- Cloudinary uploads are mocked (tests don't actually upload to Cloudinary)
- Each test cleans up after itself
- Tests run in parallel by default

