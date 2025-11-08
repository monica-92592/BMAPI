/**
 * Payment Error Handling Utilities
 * 
 * Provides consistent error handling for payment-related operations:
 * - PaymentError class for structured error handling
 * - handleStripeError function for Stripe error mapping (TODO: implement when Stripe is integrated)
 * - getUserFriendlyMessage function for user-friendly error messages
 * 
 * @module utils/errorHandler
 */

/**
 * PaymentError class for payment-related errors
 * 
 * Extends the standard Error class to provide structured error handling
 * with status codes and error codes for payment operations.
 * 
 * @class PaymentError
 * @extends Error
 */
class PaymentError extends Error {
  /**
   * Create a PaymentError instance
   * 
   * @param {string} message - Error message
   * @param {string} code - Error code (e.g., 'card_declined', 'invalid_request')
   * @param {number} statusCode - HTTP status code (default: 400)
   */
  constructor(message, code = 'unknown_error', statusCode = 400) {
    super(message);
    
    // Set error name for better error identification
    this.name = 'PaymentError';
    
    // Store error code and status code
    this.code = code;
    this.statusCode = statusCode;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaymentError);
    }
  }
}

/**
 * Handle Stripe errors and convert them to PaymentError instances
 * 
 * Maps Stripe error types to PaymentError instances with appropriate
 * error codes and status codes.
 * 
 * TODO: Implement when Stripe is integrated. This function will handle
 * actual Stripe error objects and map them to PaymentError instances.
 * 
 * @param {object} stripeError - Stripe error object
 * @returns {PaymentError} PaymentError instance with mapped error code and status
 * 
 * @example
 * try {
 *   // Stripe API call
 * } catch (error) {
 *   throw handleStripeError(error);
 * }
 */
function handleStripeError(stripeError) {
  // TODO: Implement when Stripe is integrated
  // This function will check stripeError.type and map to appropriate PaymentError
  
  // Placeholder implementation for structure
  // When Stripe is integrated, this will check stripeError.type:
  
  let errorCode = 'unknown_error';
  let statusCode = 500;
  
  // Map Stripe error types to PaymentError codes
  // This is a placeholder - actual implementation will check stripeError.type
  if (stripeError && stripeError.type) {
    switch (stripeError.type) {
      case 'StripeCardError':
        errorCode = 'card_declined';
        statusCode = 402;
        break;
      case 'StripeInvalidRequestError':
        errorCode = 'invalid_request';
        statusCode = 400;
        break;
      case 'StripeAPIError':
        errorCode = 'api_error';
        statusCode = 500;
        break;
      case 'StripeConnectionError':
        errorCode = 'network_error';
        statusCode = 503;
        break;
      case 'StripeAuthenticationError':
        errorCode = 'auth_error';
        statusCode = 401;
        break;
      case 'StripeRateLimitError':
        errorCode = 'rate_limit';
        statusCode = 429;
        break;
      default:
        errorCode = 'unknown_error';
        statusCode = 500;
    }
  }
  
  // Get error message from Stripe error or use default
  const errorMessage = stripeError?.message || 'An unknown payment error occurred';
  
  return new PaymentError(errorMessage, errorCode, statusCode);
}

/**
 * Get user-friendly error message for error codes
 * 
 * Maps technical error codes to user-friendly messages that can be
 * displayed to end users.
 * 
 * @param {string} errorCode - Error code (e.g., 'card_declined', 'invalid_request')
 * @returns {string} User-friendly error message
 * 
 * @example
 * const message = getUserFriendlyMessage('card_declined');
 * // Returns: "Your card was declined. Please try a different payment method."
 */
function getUserFriendlyMessage(errorCode) {
  // Map error codes to user-friendly messages
  const errorMessages = {
    // Card errors
    'card_declined': 'Your card was declined. Please try a different payment method.',
    'insufficient_funds': 'Your card has insufficient funds. Please use a different payment method.',
    'expired_card': 'Your card has expired. Please use a different payment method.',
    'incorrect_cvc': 'The security code (CVC) is incorrect. Please check and try again.',
    'incorrect_number': 'The card number is incorrect. Please check and try again.',
    'invalid_expiry_month': 'The expiration month is invalid. Please check and try again.',
    'invalid_expiry_year': 'The expiration year is invalid. Please check and try again.',
    
    // Request errors
    'invalid_request': 'The payment request is invalid. Please check your information and try again.',
    'processing_error': 'There was an error processing your payment. Please try again later.',
    'invalid_amount': 'The payment amount is invalid. Please check and try again.',
    'authentication_failure': 'Payment authentication failed. Please try again.',
    
    // Balance and refund errors
    'balance_insufficient': 'Insufficient balance to complete this transaction.',
    'refund_already_issued': 'A refund has already been issued for this transaction.',
    'refund_window_expired': 'The refund window for this transaction has expired.',
    
    // Payout errors
    'payout_below_minimum': 'Payout amount is below the minimum threshold. Please wait until you have more earnings.',
    'stripe_connect_not_active': 'Stripe Connect account is not active. Please complete the onboarding process.',
    'negative_balance': 'Account has a negative balance. Please resolve this before making payments.',
    
    // Network and API errors
    'network_error': 'Network error occurred. Please check your connection and try again.',
    'api_error': 'Payment service error. Please try again later.',
    'rate_limit': 'Too many requests. Please wait a moment and try again.',
    'auth_error': 'Payment authentication error. Please try again.',
    
    // Unknown errors
    'unknown_error': 'An unexpected error occurred. Please try again or contact support if the problem persists.'
  };
  
  // Return user-friendly message or default
  return errorMessages[errorCode] || errorMessages['unknown_error'];
}

module.exports = {
  PaymentError,
  handleStripeError,
  getUserFriendlyMessage
};

