const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Mock Cloudinary before any imports
jest.mock('../src/config/cloudinary', () => {
  const { Readable } = require('stream');
  return {
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        // Simulate successful upload
        const mockResult = {
          secure_url: `https://res.cloudinary.com/test/image/upload/v123/${options.public_id || 'test'}.jpg`,
          public_id: options.public_id || 'test',
          width: 1920,
          height: 1080,
          format: 'jpg'
        };
        
        // Call callback with success after a short delay
        process.nextTick(() => {
          callback(null, mockResult);
        });
        
        // Return a writable stream
        const { Writable } = require('stream');
        const stream = new Writable({
          write(chunk, encoding, next) {
            next();
          }
        });
        return stream;
      }),
      destroy: jest.fn((publicId, options, callback) => {
        // Simulate successful deletion
        process.nextTick(() => {
          if (callback) {
            callback(null, { result: 'ok' });
          }
        });
      })
    }
  };
});

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop in-memory MongoDB instance
  await mongoServer.stop();
});

// Clear database between tests
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

