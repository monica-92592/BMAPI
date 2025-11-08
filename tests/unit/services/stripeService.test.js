/**
 * StripeService Unit Tests
 * 
 * Comprehensive test suite for StripeService methods covering:
 * - Customer creation
 * - Payment method attachment
 * - Subscription management
 * - Connect account management
 * - Payment intents and charges
 * - Refunds, payouts, and transfers
 * - Error handling for all methods
 * 
 * All tests use mock Stripe API - no real Stripe calls
 */

// Mock Stripe config before importing StripeService
jest.mock('../../../src/config/stripe', () => {
  const Stripe = require('stripe');
  const mockStripeInstance = new Stripe('sk_test_mock');
  return mockStripeInstance;
});

// Mock environment variables
process.env.FRONTEND_URL = 'http://localhost:3000';

const StripeService = require('../../../src/services/stripeService');
const {
  createMockCustomer,
  createMockPaymentIntent,
  createMockSubscription,
  createMockConnectAccount,
  createMockPayout,
  createMockRefund
} = require('../../../tests/helpers/stripeMocks');
const { PaymentError } = require('../../../src/utils/errorHandler');

describe('StripeService', () => {
  let stripeService;
  let mockStripeInstance;

  beforeEach(() => {
    // Get the mocked Stripe instance from config
    const stripeConfig = require('../../../src/config/stripe');
    mockStripeInstance = stripeConfig;
    
    // Create StripeService instance
    stripeService = new StripeService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===== createCustomer() Tests =====

  describe('createCustomer()', () => {
    test('should create customer successfully', async () => {
      const businessId = 'test_business_123';
      const email = 'test@example.com';
      
      const mockCustomer = createMockCustomer({
        email,
        metadata: { businessId }
      });

      mockStripeInstance.customers.create.mockResolvedValue(mockCustomer);

      const result = await stripeService.createCustomer(businessId, email);

      expect(result).toEqual(mockCustomer);
      expect(result.id).toBe(mockCustomer.id);
      expect(result.email).toBe(email);
      expect(result.metadata.businessId).toBe(businessId);
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email,
        metadata: { businessId }
      });
      expect(mockStripeInstance.customers.create).toHaveBeenCalledTimes(1);
    });

    test('should handle invalid email error', async () => {
      const businessId = 'test_business_123';
      const email = 'invalid-email';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Invalid email address',
        code: 'invalid_request'
      };

      mockStripeInstance.customers.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createCustomer(businessId, email)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createCustomer(businessId, email)
      ).rejects.toMatchObject({
        code: 'invalid_request',
        message: expect.stringContaining('Invalid email')
      });

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email,
        metadata: { businessId }
      });
    });

    test('should handle Stripe API errors', async () => {
      const businessId = 'test_business_123';
      const email = 'test@example.com';

      const stripeError = {
        type: 'StripeAPIError',
        message: 'Stripe API error occurred',
        code: 'api_error'
      };

      mockStripeInstance.customers.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createCustomer(businessId, email)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createCustomer(businessId, email)
      ).rejects.toMatchObject({
        code: 'api_error',
        message: expect.stringContaining('Stripe API error')
      });

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email,
        metadata: { businessId }
      });
    });

    test('should handle Stripe connection errors', async () => {
      const businessId = 'test_business_123';
      const email = 'test@example.com';

      const stripeError = {
        type: 'StripeConnectionError',
        message: 'Network error',
        code: 'network_error'
      };

      mockStripeInstance.customers.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createCustomer(businessId, email)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createCustomer(businessId, email)
      ).rejects.toMatchObject({
        code: 'network_error',
        message: expect.stringContaining('Network error')
      });

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email,
        metadata: { businessId }
      });
    });

    test('should handle missing email', async () => {
      const businessId = 'test_business_123';
      const email = '';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Email is required',
        code: 'invalid_request'
      };

      mockStripeInstance.customers.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createCustomer(businessId, email)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createCustomer(businessId, email)
      ).rejects.toMatchObject({
        code: 'invalid_request',
        message: expect.stringContaining('Email is required')
      });

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email,
        metadata: { businessId }
      });
    });

    test('should handle duplicate customer error', async () => {
      const businessId = 'test_business_123';
      const email = 'existing@example.com';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Customer already exists',
        code: 'resource_already_exists'
      };

      mockStripeInstance.customers.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createCustomer(businessId, email)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createCustomer(businessId, email)
      ).rejects.toMatchObject({
        code: 'invalid_request',
        message: expect.stringContaining('Customer already exists')
      });

      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email,
        metadata: { businessId }
      });
    });
  });

  // ===== createPaymentMethod() Tests =====

  describe('createPaymentMethod()', () => {
    test('should attach payment method successfully', async () => {
      const paymentMethodId = 'pm_test123';
      const customerId = 'cus_test123';

      const mockPaymentMethod = {
        id: paymentMethodId,
        customer: customerId,
        type: 'card'
      };

      mockStripeInstance.paymentMethods.attach.mockResolvedValue(mockPaymentMethod);

      const result = await stripeService.createPaymentMethod(paymentMethodId, customerId);

      expect(result).toEqual(mockPaymentMethod);
      expect(result.id).toBe(paymentMethodId);
      expect(result.customer).toBe(customerId);
      expect(mockStripeInstance.paymentMethods.attach).toHaveBeenCalledWith(
        paymentMethodId,
        { customer: customerId }
      );
    });

    test('should handle invalid payment method error', async () => {
      const paymentMethodId = 'pm_invalid';
      const customerId = 'cus_test123';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'No such payment_method',
        code: 'resource_missing'
      };

      mockStripeInstance.paymentMethods.attach.mockRejectedValue(stripeError);

      await expect(
        stripeService.createPaymentMethod(paymentMethodId, customerId)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createPaymentMethod(paymentMethodId, customerId)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });

    test('should handle customer not found error', async () => {
      const paymentMethodId = 'pm_test123';
      const customerId = 'cus_invalid';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'No such customer',
        code: 'resource_missing'
      };

      mockStripeInstance.paymentMethods.attach.mockRejectedValue(stripeError);

      await expect(
        stripeService.createPaymentMethod(paymentMethodId, customerId)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createPaymentMethod(paymentMethodId, customerId)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });
  });

  // ===== cancelSubscription() Tests =====

  describe('cancelSubscription()', () => {
    test('should cancel subscription successfully', async () => {
      const subscriptionId = 'sub_test123';

      const mockSubscription = createMockSubscription({
        id: subscriptionId,
        status: 'canceled'
      });

      mockStripeInstance.subscriptions.cancel.mockResolvedValue(mockSubscription);

      const result = await stripeService.cancelSubscription(subscriptionId);

      expect(result).toEqual(mockSubscription);
      expect(result.status).toBe('canceled');
      expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId, {});
    });

    test('should cancel subscription immediately', async () => {
      const subscriptionId = 'sub_test123';

      const mockSubscription = createMockSubscription({
        id: subscriptionId,
        status: 'canceled'
      });

      mockStripeInstance.subscriptions.cancel.mockResolvedValue(mockSubscription);

      const result = await stripeService.cancelSubscription(subscriptionId, { immediately: true });

      expect(result).toEqual(mockSubscription);
      expect(mockStripeInstance.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId, {});
    });

    test('should handle subscription not found error', async () => {
      const subscriptionId = 'sub_invalid';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'No such subscription',
        code: 'resource_missing'
      };

      mockStripeInstance.subscriptions.cancel.mockRejectedValue(stripeError);

      await expect(
        stripeService.cancelSubscription(subscriptionId)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.cancelSubscription(subscriptionId)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });

    test('should handle already cancelled subscription', async () => {
      const subscriptionId = 'sub_test123';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Subscription is already canceled',
        code: 'resource_already_exists'
      };

      mockStripeInstance.subscriptions.cancel.mockRejectedValue(stripeError);

      await expect(
        stripeService.cancelSubscription(subscriptionId)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.cancelSubscription(subscriptionId)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });
  });

  // ===== createConnectAccount() Tests =====

  describe('createConnectAccount()', () => {
    test('should create Connect account successfully', async () => {
      const businessId = 'test_business_123';

      const mockAccount = createMockConnectAccount({
        type: 'express',
        metadata: { businessId }
      });

      mockStripeInstance.accounts.create.mockResolvedValue(mockAccount);

      const result = await stripeService.createConnectAccount(businessId);

      expect(result).toEqual(mockAccount);
      expect(result.type).toBe('express');
      expect(result.metadata.businessId).toBe(businessId);
      expect(mockStripeInstance.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        metadata: { businessId }
      });
    });

    test('should create Connect account with custom options', async () => {
      const businessId = 'test_business_123';
      const options = {
        type: 'standard',
        country: 'US',
        email: 'test@example.com'
      };

      const mockAccount = createMockConnectAccount({
        type: 'standard',
        country: 'US',
        email: 'test@example.com',
        metadata: { businessId }
      });

      mockStripeInstance.accounts.create.mockResolvedValue(mockAccount);

      const result = await stripeService.createConnectAccount(businessId, options);

      expect(result).toEqual(mockAccount);
      expect(mockStripeInstance.accounts.create).toHaveBeenCalledWith({
        type: 'standard',
        country: 'US',
        email: 'test@example.com',
        metadata: { businessId }
      });
    });

    test('should handle Connect not enabled error', async () => {
      const businessId = 'test_business_123';

      const stripeError = {
        type: 'StripeAPIError',
        message: 'Stripe Connect is not enabled',
        code: 'api_error'
      };

      mockStripeInstance.accounts.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createConnectAccount(businessId)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createConnectAccount(businessId)
      ).rejects.toMatchObject({
        code: 'api_error'
      });
    });

    test('should handle Stripe API errors', async () => {
      const businessId = 'test_business_123';

      const stripeError = {
        type: 'StripeAPIError',
        message: 'Stripe API error occurred',
        code: 'api_error'
      };

      mockStripeInstance.accounts.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createConnectAccount(businessId)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createConnectAccount(businessId)
      ).rejects.toMatchObject({
        code: 'api_error'
      });
    });
  });

  // ===== createAccountLink() Tests =====

  describe('createAccountLink()', () => {
    test('should create account link successfully', async () => {
      const stripeAccountId = 'acct_test123';
      const businessId = 'test_business_123';

      const mockAccountLink = {
        object: 'account_link',
        url: 'https://connect.stripe.com/setup/s/acct_test123',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };

      mockStripeInstance.accountLinks.create.mockResolvedValue(mockAccountLink);

      const result = await stripeService.createAccountLink(stripeAccountId, businessId);

      expect(result).toEqual(mockAccountLink);
      expect(result.url).toBeDefined();
      expect(mockStripeInstance.accountLinks.create).toHaveBeenCalledWith({
        account: stripeAccountId,
        refresh_url: `${process.env.FRONTEND_URL}/business/stripe/refresh`,
        return_url: `${process.env.FRONTEND_URL}/business/stripe/return`,
        type: 'account_onboarding'
      });
    });

    test('should create account link with custom options', async () => {
      const stripeAccountId = 'acct_test123';
      const businessId = 'test_business_123';
      const options = {
        type: 'account_update',
        refresh_url: 'http://localhost:3000/refresh',
        return_url: 'http://localhost:3000/return'
      };

      const mockAccountLink = {
        object: 'account_link',
        url: 'https://connect.stripe.com/setup/s/acct_test123',
        expires_at: Math.floor(Date.now() / 1000) + 3600
      };

      mockStripeInstance.accountLinks.create.mockResolvedValue(mockAccountLink);

      const result = await stripeService.createAccountLink(stripeAccountId, businessId, options);

      expect(result).toEqual(mockAccountLink);
      expect(mockStripeInstance.accountLinks.create).toHaveBeenCalledWith({
        account: stripeAccountId,
        refresh_url: options.refresh_url,
        return_url: options.return_url,
        type: options.type
      });
    });

    test('should handle invalid account ID error', async () => {
      const stripeAccountId = 'acct_invalid';
      const businessId = 'test_business_123';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'No such account',
        code: 'resource_missing'
      };

      mockStripeInstance.accountLinks.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createAccountLink(stripeAccountId, businessId)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createAccountLink(stripeAccountId, businessId)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });

    test('should handle missing FRONTEND_URL error', async () => {
      const originalFrontendUrl = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      const stripeAccountId = 'acct_test123';
      const businessId = 'test_business_123';

      await expect(
        stripeService.createAccountLink(stripeAccountId, businessId)
      ).rejects.toThrow('FRONTEND_URL is required');

      // Restore FRONTEND_URL
      process.env.FRONTEND_URL = originalFrontendUrl;
    });
  });

  // ===== isAccountActive() Tests =====

  describe('isAccountActive()', () => {
    test('should return true for active account', async () => {
      const stripeAccountId = 'acct_test123';

      const mockAccount = createMockConnectAccount({
        id: stripeAccountId,
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true
      });

      mockStripeInstance.accounts.retrieve.mockResolvedValue(mockAccount);

      const result = await stripeService.isAccountActive(stripeAccountId);

      expect(result).toBe(true);
      expect(mockStripeInstance.accounts.retrieve).toHaveBeenCalledWith(stripeAccountId);
    });

    test('should return false for inactive account', async () => {
      const stripeAccountId = 'acct_test123';

      const mockAccount = createMockConnectAccount({
        id: stripeAccountId,
        details_submitted: false,
        charges_enabled: false,
        payouts_enabled: false
      });

      mockStripeInstance.accounts.retrieve.mockResolvedValue(mockAccount);

      const result = await stripeService.isAccountActive(stripeAccountId);

      expect(result).toBe(false);
      expect(mockStripeInstance.accounts.retrieve).toHaveBeenCalledWith(stripeAccountId);
    });

    test('should return false for account with charges disabled', async () => {
      const stripeAccountId = 'acct_test123';

      const mockAccount = createMockConnectAccount({
        id: stripeAccountId,
        details_submitted: true,
        charges_enabled: false,
        payouts_enabled: true
      });

      mockStripeInstance.accounts.retrieve.mockResolvedValue(mockAccount);

      const result = await stripeService.isAccountActive(stripeAccountId);

      expect(result).toBe(false);
    });

    test('should handle account not found error', async () => {
      const stripeAccountId = 'acct_invalid';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'No such account',
        code: 'resource_missing'
      };

      mockStripeInstance.accounts.retrieve.mockRejectedValue(stripeError);

      await expect(
        stripeService.isAccountActive(stripeAccountId)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.isAccountActive(stripeAccountId)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });
  });

  // ===== createPaymentIntent() Tests =====

  describe('createPaymentIntent()', () => {
    test('should create payment intent successfully', async () => {
      const amount = 10000; // $100.00 in cents
      const customerId = 'cus_test123';
      const metadata = { licenseId: 'license_123' };

      const mockPaymentIntent = createMockPaymentIntent({
        amount,
        customer: customerId,
        metadata
      });

      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.createPaymentIntent(amount, customerId, metadata);

      expect(result).toEqual(mockPaymentIntent);
      expect(result.amount).toBe(amount);
      expect(result.customer).toBe(customerId);
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount,
        currency: 'usd',
        customer: customerId,
        metadata
      });
    });

    test('should create payment intent with custom options', async () => {
      const amount = 10000;
      const customerId = 'cus_test123';
      const metadata = { licenseId: 'license_123' };
      const options = {
        currency: 'eur',
        payment_method: 'pm_test123',
        confirmation_method: 'manual',
        confirm: true
      };

      const mockPaymentIntent = createMockPaymentIntent({
        amount,
        customer: customerId,
        metadata,
        currency: 'eur'
      });

      mockStripeInstance.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await stripeService.createPaymentIntent(amount, customerId, metadata, options);

      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripeInstance.paymentIntents.create).toHaveBeenCalledWith({
        amount,
        currency: 'eur',
        customer: customerId,
        payment_method: 'pm_test123',
        confirmation_method: 'manual',
        confirm: true,
        metadata
      });
    });

    test('should handle invalid amount error', async () => {
      const amount = 0;
      const customerId = 'cus_test123';

      await expect(
        stripeService.createPaymentIntent(amount, customerId)
      ).rejects.toThrow('Amount must be greater than 0');
    });

    test('should handle customer not found error', async () => {
      const amount = 10000;
      const customerId = 'cus_invalid';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'No such customer',
        code: 'resource_missing'
      };

      mockStripeInstance.paymentIntents.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createPaymentIntent(amount, customerId)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createPaymentIntent(amount, customerId)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });
  });

  // ===== createDestinationCharge() Tests =====

  describe('createDestinationCharge()', () => {
    test('should create destination charge successfully', async () => {
      const amount = 10000; // $100.00 in cents
      const customerId = 'cus_test123';
      const destination = 'acct_test123';
      const metadata = { licenseId: 'license_123' };

      const mockCharge = {
        id: 'ch_test123',
        amount,
        currency: 'usd',
        customer: customerId,
        destination,
        status: 'succeeded'
      };

      mockStripeInstance.charges.create.mockResolvedValue(mockCharge);

      const result = await stripeService.createDestinationCharge(amount, customerId, destination, metadata);

      expect(result).toEqual(mockCharge);
      expect(result.amount).toBe(amount);
      expect(result.destination).toBe(destination);
      expect(mockStripeInstance.charges.create).toHaveBeenCalledWith({
        amount,
        currency: 'usd',
        customer: customerId,
        destination,
        metadata
      });
    });

    test('should create destination charge with custom options', async () => {
      const amount = 10000;
      const customerId = 'cus_test123';
      const destination = 'acct_test123';
      const metadata = { licenseId: 'license_123' };
      const options = {
        currency: 'eur',
        application_fee_amount: 500,
        payment_method: 'pm_test123'
      };

      const mockCharge = {
        id: 'ch_test123',
        amount,
        currency: 'eur',
        customer: customerId,
        destination,
        application_fee_amount: 500,
        status: 'succeeded'
      };

      mockStripeInstance.charges.create.mockResolvedValue(mockCharge);

      const result = await stripeService.createDestinationCharge(amount, customerId, destination, metadata, options);

      expect(result).toEqual(mockCharge);
      expect(mockStripeInstance.charges.create).toHaveBeenCalledWith({
        amount,
        currency: 'eur',
        customer: customerId,
        destination,
        application_fee_amount: 500,
        payment_method: 'pm_test123',
        metadata
      });
    });

    test('should handle invalid amount error', async () => {
      const amount = 0;
      const customerId = 'cus_test123';
      const destination = 'acct_test123';

      await expect(
        stripeService.createDestinationCharge(amount, customerId, destination)
      ).rejects.toThrow('Amount must be greater than 0');
    });

    test('should handle missing destination error', async () => {
      const amount = 10000;
      const customerId = 'cus_test123';
      const destination = '';

      await expect(
        stripeService.createDestinationCharge(amount, customerId, destination)
      ).rejects.toThrow('Destination (Connect account ID) is required');
    });

    test('should handle inactive account error', async () => {
      const amount = 10000;
      const customerId = 'cus_test123';
      const destination = 'acct_inactive';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Account is not active',
        code: 'account_inactive'
      };

      mockStripeInstance.charges.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createDestinationCharge(amount, customerId, destination)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createDestinationCharge(amount, customerId, destination)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });
  });

  // ===== createRefund() Tests =====

  describe('createRefund()', () => {
    test('should create refund successfully', async () => {
      const paymentIntentId = 'pi_test123';
      const reason = 'requested_by_customer';

      const mockRefund = createMockRefund({
        payment_intent: paymentIntentId,
        reason
      });

      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund);

      const result = await stripeService.createRefund(paymentIntentId, reason);

      expect(result).toEqual(mockRefund);
      expect(result.payment_intent).toBe(paymentIntentId);
      expect(result.reason).toBe(reason);
      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: paymentIntentId,
        reason
      });
    });

    test('should create partial refund with amount', async () => {
      const paymentIntentId = 'pi_test123';
      const reason = 'requested_by_customer';
      const options = {
        amount: 5000 // $50.00 in cents
      };

      const mockRefund = createMockRefund({
        payment_intent: paymentIntentId,
        reason,
        amount: 5000
      });

      mockStripeInstance.refunds.create.mockResolvedValue(mockRefund);

      const result = await stripeService.createRefund(paymentIntentId, reason, options);

      expect(result).toEqual(mockRefund);
      expect(mockStripeInstance.refunds.create).toHaveBeenCalledWith({
        payment_intent: paymentIntentId,
        reason,
        amount: 5000
      });
    });

    test('should handle payment intent not found error', async () => {
      const paymentIntentId = 'pi_invalid';
      const reason = 'requested_by_customer';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'No such payment_intent',
        code: 'resource_missing'
      };

      mockStripeInstance.refunds.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createRefund(paymentIntentId, reason)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createRefund(paymentIntentId, reason)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });

    test('should handle missing payment intent ID error', async () => {
      const paymentIntentId = '';
      const reason = 'requested_by_customer';

      await expect(
        stripeService.createRefund(paymentIntentId, reason)
      ).rejects.toThrow('Payment intent ID is required');
    });

    test('should handle invalid reason error', async () => {
      const paymentIntentId = 'pi_test123';
      const reason = 'invalid_reason';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Invalid reason',
        code: 'invalid_request'
      };

      mockStripeInstance.refunds.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createRefund(paymentIntentId, reason)
      ).rejects.toThrow(PaymentError);
    });

    test('should handle already refunded error', async () => {
      const paymentIntentId = 'pi_test123';
      const reason = 'requested_by_customer';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Payment intent already refunded',
        code: 'resource_already_exists'
      };

      mockStripeInstance.refunds.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createRefund(paymentIntentId, reason)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createRefund(paymentIntentId, reason)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });
  });

  // ===== createPayout() Tests =====

  describe('createPayout()', () => {
    test('should create payout successfully', async () => {
      const amount = 10000; // $100.00 in cents
      const stripeAccountId = 'acct_test123';
      const metadata = { businessId: 'business_123' };

      const mockPayout = createMockPayout({
        amount,
        metadata
      });

      mockStripeInstance.payouts.create.mockResolvedValue(mockPayout);

      const result = await stripeService.createPayout(stripeAccountId, amount, metadata);

      expect(result).toEqual(mockPayout);
      expect(result.amount).toBe(amount);
      expect(mockStripeInstance.payouts.create).toHaveBeenCalledWith(
        {
          amount,
          currency: 'usd',
          metadata
        },
        { stripeAccount: stripeAccountId }
      );
    });

    test('should create payout with custom options', async () => {
      const amount = 10000;
      const stripeAccountId = 'acct_test123';
      const metadata = { businessId: 'business_123' };
      const options = {
        currency: 'eur',
        method: 'instant',
        destination: 'ba_test123'
      };

      const mockPayout = createMockPayout({
        amount,
        currency: 'eur',
        metadata
      });

      mockStripeInstance.payouts.create.mockResolvedValue(mockPayout);

      const result = await stripeService.createPayout(stripeAccountId, amount, metadata, options);

      expect(result).toEqual(mockPayout);
      expect(mockStripeInstance.payouts.create).toHaveBeenCalledWith(
        {
          amount,
          currency: 'eur',
          method: 'instant',
          destination: 'ba_test123',
          metadata
        },
        { stripeAccount: stripeAccountId }
      );
    });

    test('should handle invalid amount error', async () => {
      const amount = 0;
      const stripeAccountId = 'acct_test123';

      await expect(
        stripeService.createPayout(stripeAccountId, amount)
      ).rejects.toThrow('Amount must be greater than 0');
    });

    test('should handle missing account ID error', async () => {
      const amount = 10000;
      const stripeAccountId = '';

      await expect(
        stripeService.createPayout(stripeAccountId, amount)
      ).rejects.toThrow('Stripe Connect account ID is required');
    });

    test('should handle insufficient balance error', async () => {
      const amount = 10000;
      const stripeAccountId = 'acct_test123';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Insufficient balance',
        code: 'insufficient_funds'
      };

      mockStripeInstance.payouts.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createPayout(amount, stripeAccountId)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createPayout(amount, stripeAccountId)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });

    test('should handle inactive account error', async () => {
      const amount = 10000;
      const stripeAccountId = 'acct_inactive';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Account is not active',
        code: 'account_inactive'
      };

      mockStripeInstance.payouts.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createPayout(stripeAccountId, amount)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createPayout(stripeAccountId, amount)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });
  });

  // ===== createTransfer() Tests =====

  describe('createTransfer()', () => {
    test('should create transfer successfully', async () => {
      const amount = 10000; // $100.00 in cents
      const destination = 'acct_test123';
      const metadata = { businessId: 'business_123' };

      const mockTransfer = {
        id: 'tr_test123',
        amount,
        currency: 'usd',
        destination,
        status: 'paid',
        metadata
      };

      mockStripeInstance.transfers.create.mockResolvedValue(mockTransfer);

      const result = await stripeService.createTransfer(amount, destination, metadata);

      expect(result).toEqual(mockTransfer);
      expect(result.amount).toBe(amount);
      expect(result.destination).toBe(destination);
      expect(mockStripeInstance.transfers.create).toHaveBeenCalledWith({
        amount,
        currency: 'usd',
        destination,
        metadata
      });
    });

    test('should create transfer with custom options', async () => {
      const amount = 10000;
      const destination = 'acct_test123';
      const metadata = { businessId: 'business_123' };
      const options = {
        currency: 'eur',
        source_transaction: 'ch_test123',
        transfer_group: 'group_123'
      };

      const mockTransfer = {
        id: 'tr_test123',
        amount,
        currency: 'eur',
        destination,
        source_transaction: 'ch_test123',
        transfer_group: 'group_123',
        status: 'paid',
        metadata
      };

      mockStripeInstance.transfers.create.mockResolvedValue(mockTransfer);

      const result = await stripeService.createTransfer(amount, destination, metadata, options);

      expect(result).toEqual(mockTransfer);
      expect(mockStripeInstance.transfers.create).toHaveBeenCalledWith({
        amount,
        currency: 'eur',
        destination,
        source_transaction: 'ch_test123',
        transfer_group: 'group_123',
        metadata
      });
    });

    test('should handle invalid amount error', async () => {
      const amount = 0;
      const destination = 'acct_test123';

      await expect(
        stripeService.createTransfer(amount, destination)
      ).rejects.toThrow('Amount must be greater than 0');
    });

    test('should handle missing destination error', async () => {
      const amount = 10000;
      const destination = '';

      await expect(
        stripeService.createTransfer(amount, destination)
      ).rejects.toThrow('Destination (Connect account ID) is required');
    });

    test('should handle inactive account error', async () => {
      const amount = 10000;
      const destination = 'acct_inactive';

      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Account is not active',
        code: 'account_inactive'
      };

      mockStripeInstance.transfers.create.mockRejectedValue(stripeError);

      await expect(
        stripeService.createTransfer(amount, destination)
      ).rejects.toThrow(PaymentError);

      await expect(
        stripeService.createTransfer(amount, destination)
      ).rejects.toMatchObject({
        code: 'invalid_request'
      });
    });
  });
});

