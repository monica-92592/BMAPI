/**
 * Error Middleware Unit Tests
 * 
 * Comprehensive test suite for error handling middleware:
 * - PaymentError handling
 * - Mongoose ValidationError handling
 * - Mongoose CastError handling
 * - JWT error handling
 * - MongoDB duplicate key error handling
 * - Multer error handling
 * - Generic error handling
 * - Error logging
 */

const errorHandler = require('../../../src/middlewares/errorMiddleware');
const { PaymentError } = require('../../../src/utils/errorHandler');
const mongoose = require('mongoose');

describe('Error Middleware', () => {
  let mockReq, mockRes, mockNext;
  let consoleErrorSpy;

  // Set up mock objects before each test
  beforeEach(() => {
    // Mock request object
    mockReq = {
      method: 'GET',
      url: '/api/test',
      originalUrl: '/api/test',
      headers: {}
    };

    // Mock response object
    mockRes = {
      statusCode: null,
      responseData: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.responseData = data;
        return this;
      }
    };

    // Mock next function
    mockNext = jest.fn();

    // Spy on console.error to verify logging
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // Clean up after each test
  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  // ===== PaymentError Tests =====
  
  describe('PaymentError handling', () => {
    test('should handle PaymentError with correct status code and message', () => {
      const error = new PaymentError('Card declined', 'card_declined', 402);
      
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(402);
      expect(mockRes.responseData).toBeDefined();
      expect(mockRes.responseData.success).toBe(false);
      expect(mockRes.responseData.error).toBe('card_declined');
      expect(mockRes.responseData.message).toBeDefined();
      expect(typeof mockRes.responseData.message).toBe('string');
    });

    test('should include user-friendly message for PaymentError', () => {
      const error = new PaymentError('Insufficient funds', 'insufficient_funds', 402);
      
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.responseData.message).toContain('insufficient funds');
    });

    test('should include details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new PaymentError('Test error', 'test_code', 400);
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.responseData.details).toBeDefined();
      expect(mockRes.responseData.details).toBe('Test error');
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should hide details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new PaymentError('Test error', 'test_code', 400);
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.responseData.details).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  // ===== Stripe Error Tests =====
  
  describe('Stripe error handling', () => {
    test('should handle StripeCardError', () => {
      const stripeError = {
        type: 'StripeCardError',
        message: 'Your card was declined'
      };
      
      errorHandler(stripeError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(402);
      expect(mockRes.responseData.error).toBe('card_declined');
      expect(mockRes.responseData.message).toBeDefined();
    });

    test('should handle StripeAPIError', () => {
      const stripeError = {
        type: 'StripeAPIError',
        message: 'API error occurred'
      };
      
      errorHandler(stripeError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.responseData.error).toBe('api_error');
    });

    test('should handle StripeConnectionError', () => {
      const stripeError = {
        type: 'StripeConnectionError',
        message: 'Connection error'
      };
      
      errorHandler(stripeError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(503);
      expect(mockRes.responseData.error).toBe('network_error');
    });
  });

  // ===== Mongoose ValidationError Tests =====
  
  describe('Mongoose ValidationError handling', () => {
    test('should handle ValidationError with field-specific messages', () => {
      const validationError = new mongoose.Error.ValidationError();
      validationError.errors = {
        email: { message: 'Email is required' },
        password: { message: 'Password is too short' }
      };
      
      errorHandler(validationError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.success).toBe(false);
      expect(mockRes.responseData.error).toBe('validation_error');
      expect(mockRes.responseData.message).toBe('Validation failed');
      expect(mockRes.responseData.errors).toBeDefined();
      expect(mockRes.responseData.errors.email).toBe('Email is required');
      expect(mockRes.responseData.errors.password).toBe('Password is too short');
    });

    test('should handle ValidationError with single field', () => {
      const validationError = new mongoose.Error.ValidationError();
      validationError.errors = {
        email: { message: 'Email is invalid' }
      };
      
      errorHandler(validationError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.errors.email).toBe('Email is invalid');
    });

    test('should include details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const validationError = new mongoose.Error.ValidationError();
      validationError.errors = {
        email: { message: 'Email is required' }
      };
      
      errorHandler(validationError, mockReq, mockRes, mockNext);

      expect(mockRes.responseData.details).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  // ===== Mongoose CastError Tests =====
  
  describe('Mongoose CastError handling', () => {
    test('should handle CastError for invalid ObjectId', () => {
      const castError = new mongoose.Error.CastError('ObjectId', 'invalid-id', '_id');
      
      errorHandler(castError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.success).toBe(false);
      expect(mockRes.responseData.error).toBe('invalid_id');
      expect(mockRes.responseData.message).toBe('Invalid ID format');
    });

    test('should handle CastError for different fields', () => {
      const castError = new mongoose.Error.CastError('ObjectId', 'invalid', 'userId');
      
      errorHandler(castError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.message).toBe('Invalid ID format');
    });
  });

  // ===== JWT Error Tests =====
  
  describe('JWT error handling', () => {
    test('should handle JsonWebTokenError', () => {
      const jwtError = new Error('Invalid token');
      jwtError.name = 'JsonWebTokenError';
      
      errorHandler(jwtError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.responseData.success).toBe(false);
      expect(mockRes.responseData.error).toBe('authentication_error');
      expect(mockRes.responseData.message).toBe('Invalid or expired token');
    });

    test('should handle TokenExpiredError', () => {
      const jwtError = new Error('Token expired');
      jwtError.name = 'TokenExpiredError';
      
      errorHandler(jwtError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(401);
      expect(mockRes.responseData.error).toBe('authentication_error');
      expect(mockRes.responseData.message).toBe('Invalid or expired token');
    });
  });

  // ===== MongoDB Duplicate Key Error Tests =====
  
  describe('MongoDB duplicate key error handling', () => {
    test('should handle duplicate key error (code 11000)', () => {
      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;
      duplicateError.keyPattern = { email: 1 };
      
      errorHandler(duplicateError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(409);
      expect(mockRes.responseData.success).toBe(false);
      expect(mockRes.responseData.error).toBe('duplicate_key');
      expect(mockRes.responseData.message).toBe('email already exists');
    });

    test('should handle duplicate key error (code 11001)', () => {
      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11001;
      duplicateError.keyPattern = { username: 1 };
      
      errorHandler(duplicateError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(409);
      expect(mockRes.responseData.message).toBe('username already exists');
    });

    test('should handle duplicate key error without keyPattern', () => {
      const duplicateError = new Error('Duplicate key');
      duplicateError.code = 11000;
      
      errorHandler(duplicateError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(409);
      expect(mockRes.responseData.message).toBe('resource already exists');
    });
  });

  // ===== Multer Error Tests =====
  
  describe('Multer error handling', () => {
    test('should handle LIMIT_FILE_SIZE error', () => {
      const multerError = new Error('File too large');
      multerError.name = 'MulterError';
      multerError.code = 'LIMIT_FILE_SIZE';
      
      errorHandler(multerError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.success).toBe(false);
      expect(mockRes.responseData.error).toBe('file_too_large');
      expect(mockRes.responseData.message).toBe('The uploaded file exceeds the maximum allowed size');
    });

    test('should handle LIMIT_FILE_COUNT error', () => {
      const multerError = new Error('Too many files');
      multerError.name = 'MulterError';
      multerError.code = 'LIMIT_FILE_COUNT';
      
      errorHandler(multerError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.error).toBe('too_many_files');
      expect(mockRes.responseData.message).toBe('Too many files uploaded at once');
    });

    test('should handle other MulterError', () => {
      const multerError = new Error('Upload error');
      multerError.name = 'MulterError';
      multerError.code = 'UNKNOWN';
      
      errorHandler(multerError, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(400);
      expect(mockRes.responseData.error).toBe('upload_error');
      expect(mockRes.responseData.message).toBe('Upload error');
    });
  });

  // ===== Generic Error Tests =====
  
  describe('Generic error handling', () => {
    test('should handle standard Error with 500 status', () => {
      const error = new Error('Something went wrong');
      
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(500);
      expect(mockRes.responseData.success).toBe(false);
      expect(mockRes.responseData.error).toBe('internal_error');
      expect(mockRes.responseData.message).toBeDefined();
    });

    test('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Internal server error');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.responseData.message).toBe('An error occurred. Please try again later.');
      expect(mockRes.responseData.details).toBeUndefined();
      expect(mockRes.responseData.stack).toBeUndefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Internal server error');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.responseData.details).toBeDefined();
      expect(mockRes.responseData.stack).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should handle error with custom status code', () => {
      const error = new Error('Custom error');
      error.statusCode = 418;
      
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(418);
    });

    test('should handle error with status property', () => {
      const error = new Error('Custom error');
      error.status = 403;
      
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.statusCode).toBe(403);
    });
  });

  // ===== Error Logging Tests =====
  
  describe('Error logging', () => {
    test('should log error details', () => {
      const error = new Error('Test error');
      error.code = 'test_code';
      
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logCall = consoleErrorSpy.mock.calls[0][0];
      expect(logCall).toBe('Error Details:');
    });

    test('should log error name and message', () => {
      const error = new PaymentError('Card declined', 'card_declined', 402);
      
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logArgs = consoleErrorSpy.mock.calls[0][1];
      expect(logArgs.name).toBe('PaymentError');
      expect(logArgs.message).toBe('Card declined');
      expect(logArgs.code).toBe('card_declined');
      expect(logArgs.statusCode).toBe(402);
    });

    test('should log stack trace in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const error = new Error('Test error');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logArgs = consoleErrorSpy.mock.calls[0][1];
      expect(logArgs.stack).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    test('should hide stack trace in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const error = new Error('Test error');
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logArgs = consoleErrorSpy.mock.calls[0][1];
      expect(logArgs.stack).toBe('Hidden in production');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  // ===== Response Format Tests =====
  
  describe('Response format', () => {
    test('should return consistent JSON format', () => {
      const error = new PaymentError('Test error', 'test_code', 400);
      
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.responseData).toHaveProperty('success');
      expect(mockRes.responseData).toHaveProperty('error');
      expect(mockRes.responseData).toHaveProperty('message');
      expect(mockRes.responseData.success).toBe(false);
    });

    test('should always return JSON response', () => {
      const error = new Error('Test error');
      
      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.responseData).toBeDefined();
      expect(typeof mockRes.responseData).toBe('object');
    });
  });
});

