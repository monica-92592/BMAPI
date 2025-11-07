// Mock Cloudinary for testing
jest.mock('../../src/config/cloudinary', () => {
  const mockCloudinary = {
    uploader: {
      upload_stream: jest.fn((options, callback) => {
        // Simulate successful upload
        const mockResult = {
          secure_url: `https://res.cloudinary.com/test/image/upload/v123/test.jpg`,
          public_id: 'test',
          width: 1920,
          height: 1080,
          format: 'jpg'
        };
        
        // Call callback with success
        setTimeout(() => {
          callback(null, mockResult);
        }, 0);
        
        // Return a writable stream
        const { Writable } = require('stream');
        return new Writable({
          write(chunk, encoding, next) {
            next();
          }
        });
      }),
      destroy: jest.fn((publicId, options, callback) => {
        // Simulate successful deletion
        setTimeout(() => {
          callback(null, { result: 'ok' });
        }, 0);
      })
    }
  };
  
  return mockCloudinary;
});

