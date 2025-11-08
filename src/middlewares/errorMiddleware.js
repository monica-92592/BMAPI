/**
 * Enhanced Error Handling Middleware
 * 
 * Comprehensive error handling middleware that handles:
 * - PaymentError instances
 * - Stripe errors
 * - Mongoose validation and cast errors
 * - JWT errors
 * - MongoDB duplicate key errors
 * - Default errors
 * 
 * Provides consistent JSON error responses and appropriate logging.
 * 
 * @module middlewares/errorMiddleware
 */

const { PaymentError, handleStripeError, getUserFriendlyMessage } = require('../utils/errorHandler');
const mongoose = require('mongoose');

/**
 * Enhanced error handling middleware
 * 
 * Handles various error types and returns consistent JSON responses.
 * Logs error details appropriately based on environment.
 * 
 * @param {Error} err - Error object
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorHandler = (err, req, res, next) => {
  // Determine if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log error details
  console.error('Error Details:', {
    name: err.name,
    message: err.message,
    code: err.code || 'N/A',
    statusCode: err.statusCode || err.status || 'N/A',
    stack: isDevelopment ? err.stack : 'Hidden in production'
  });

  // Handle Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    try {
      const paymentError = handleStripeError(err);
      const userMessage = getUserFriendlyMessage(paymentError.code);
      
      return res.status(paymentError.statusCode).json({
        success: false,
        error: paymentError.code,
        message: userMessage,
        ...(isDevelopment && { details: paymentError.message })
      });
    } catch (handleError) {
      // Fall through to default error handling
      console.error('Error handling Stripe error:', handleError);
    }
  }

  // Handle PaymentError instances
  if (err instanceof PaymentError) {
    const userMessage = getUserFriendlyMessage(err.code);
    
    return res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: userMessage,
      ...(isDevelopment && { details: err.message, stack: err.stack })
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError' && err.errors) {
    const validationErrors = {};
    const errorMessages = [];
    
    // Extract validation messages
    Object.keys(err.errors).forEach(key => {
      const error = err.errors[key];
      validationErrors[key] = error.message;
      errorMessages.push(error.message);
    });
    
    return res.status(400).json({
      success: false,
      error: 'validation_error',
      message: 'Validation failed',
      errors: validationErrors,
      ...(isDevelopment && { details: errorMessages.join(', ') })
    });
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).json({
      success: false,
      error: 'invalid_id',
      message: 'Invalid ID format'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'authentication_error',
      message: 'Invalid or expired token'
    });
  }

  // Handle MongoDB duplicate key errors
  if (err.code === 11000 || err.code === 11001) {
    const field = Object.keys(err.keyPattern || {})[0] || 'resource';
    return res.status(409).json({
      success: false,
      error: 'duplicate_key',
      message: `${field} already exists`
    });
  }

  // Handle Multer errors (file upload)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'file_too_large',
        message: 'The uploaded file exceeds the maximum allowed size'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'too_many_files',
        message: 'Too many files uploaded at once'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'upload_error',
      message: err.message || 'File upload error'
    });
  }

  // Handle default errors
  const statusCode = err.statusCode || err.status || 500;
  const errorMessage = err.message || 'Internal server error';
  
  // Hide sensitive information in production
  const response = {
    success: false,
    error: 'internal_error',
    message: isDevelopment ? errorMessage : 'An error occurred. Please try again later.'
  };
  
  // Add stack trace and details only in development
  if (isDevelopment) {
    response.details = errorMessage;
    response.stack = err.stack;
  }
  
  return res.status(statusCode).json(response);
};

module.exports = errorHandler;

