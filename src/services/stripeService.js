/**
 * Stripe Service
 * 
 * Service class for Stripe API operations.
 * 
 * This service provides methods for:
 * - Customer management
 * - Payment methods
 * - Subscriptions
 * - Stripe Connect accounts
 * - Payment intents
 * - Charges and transfers
 * - Refunds and payouts
 * 
 * TODO: Implement all methods when Stripe is configured
 * 
 * @module services/stripeService
 */

const stripe = require('../config/stripe');
const { handleStripeError } = require('../utils/errorHandler');

/**
 * StripeService class
 * 
 * Provides methods for interacting with Stripe API.
 * All methods are currently stubbed and will throw errors
 * until Stripe is configured.
 * 
 * @class StripeService
 */
class StripeService {
  /**
   * Create a new StripeService instance
   */
  constructor() {
    // Stripe instance will be available when configured
    this.stripe = stripe;
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.');
    }
  }

  /**
   * Create a Stripe customer for a business
   * 
   * @param {string} businessId - Business ID from database
   * @param {string} email - Customer email address
   * @returns {Promise<object>} Stripe customer object
   * @throws {PaymentError} If Stripe API call fails
   */
  async createCustomer(businessId, email) {
    try {
      const customer = await this.stripe.customers.create({
        email,
        metadata: { businessId }
      });
      return customer;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Create or attach a payment method to a customer
   * 
   * @param {string} paymentMethodId - Stripe payment method ID
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<object>} Stripe payment method object
   * @throws {PaymentError} If Stripe API call fails
   */
  async createPaymentMethod(paymentMethodId, customerId) {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId
      });
      return paymentMethod;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Create a subscription for a customer
   * 
   * @param {string} customerId - Stripe customer ID
   * @param {string} priceId - Stripe price ID for subscription
   * @param {object} metadata - Additional metadata for subscription
   * @param {object} options - Optional subscription parameters
   * @param {string} options.payment_behavior - Payment behavior (e.g., 'default_incomplete')
   * @param {string} options.default_payment_method - Default payment method ID
   * @returns {Promise<object>} Stripe subscription object
   * @throws {PaymentError} If Stripe API call fails
   */
  async createSubscription(customerId, priceId, metadata = {}, options = {}) {
    try {
      const subscriptionParams = {
        customer: customerId,
        items: [{ price: priceId }],
        metadata
      };
      
      // Allow passing payment_behavior for testing or incomplete subscriptions
      if (options.payment_behavior) {
        subscriptionParams.payment_behavior = options.payment_behavior;
      }
      
      // Allow passing default_payment_method if provided
      if (options.default_payment_method) {
        subscriptionParams.default_payment_method = options.default_payment_method;
      }
      
      const subscription = await this.stripe.subscriptions.create(subscriptionParams);
      return subscription;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Cancel a subscription
   * 
   * @param {string} subscriptionId - Stripe subscription ID
   * @param {object} options - Optional cancellation parameters
   * @param {boolean} options.immediately - If true, cancel immediately; if false, cancel at period end
   * @returns {Promise<object>} Cancelled subscription object
   * @throws {PaymentError} If Stripe API call fails
   */
  async cancelSubscription(subscriptionId, options = {}) {
    try {
      const cancelParams = {};
      
      // If immediately is false, cancel at period end; otherwise cancel immediately
      if (options.immediately === false) {
        cancelParams.cancel_at_period_end = true;
      }
      
      const subscription = await this.stripe.subscriptions.cancel(subscriptionId, cancelParams);
      return subscription;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Create a Stripe Connect account for a business
   * 
   * @param {string} businessId - Business ID from database
   * @param {object} options - Optional account creation parameters
   * @param {string} options.type - Account type ('express', 'standard', or 'custom'), defaults to 'express'
   * @param {string} options.country - Country code (e.g., 'US'), defaults to 'US'
   * @param {string} options.email - Email for the account
   * @returns {Promise<object>} Stripe Connect account object
   * @throws {PaymentError} If Stripe API call fails
   */
  async createConnectAccount(businessId, options = {}) {
    try {
      const accountParams = {
        type: options.type || 'express',
        metadata: { businessId }
      };
      
      // Add optional parameters if provided
      if (options.country) {
        accountParams.country = options.country;
      }
      
      if (options.email) {
        accountParams.email = options.email;
      }
      
      const account = await this.stripe.accounts.create(accountParams);
      return account;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Create an account link for Stripe Connect onboarding
   * 
   * @param {string} stripeAccountId - Stripe Connect account ID
   * @param {string} businessId - Business ID from database
   * @param {object} options - Optional account link parameters
   * @param {string} options.type - Link type ('account_onboarding' or 'account_update'), defaults to 'account_onboarding'
   * @param {string} options.refresh_url - Custom refresh URL (overrides default)
   * @param {string} options.return_url - Custom return URL (overrides default)
   * @returns {Promise<object>} Account link object with URL
   * @throws {PaymentError} If Stripe API call fails or FRONTEND_URL is missing
   */
  async createAccountLink(stripeAccountId, businessId, options = {}) {
    try {
      // Check if FRONTEND_URL is set
      if (!process.env.FRONTEND_URL) {
        throw new Error('FRONTEND_URL is required in environment variables for account links');
      }
      
      const accountLinkParams = {
        account: stripeAccountId,
        refresh_url: options.refresh_url || `${process.env.FRONTEND_URL}/business/stripe/refresh`,
        return_url: options.return_url || `${process.env.FRONTEND_URL}/business/stripe/return`,
        type: options.type || 'account_onboarding'
      };
      
      const accountLink = await this.stripe.accountLinks.create(accountLinkParams);
      return accountLink;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Check if a Stripe Connect account is active
   * 
   * An account is considered active if:
   * - Details have been submitted (details_submitted === true)
   * - Charges are enabled (charges_enabled === true)
   * 
   * @param {string} stripeAccountId - Stripe Connect account ID
   * @returns {Promise<boolean>} True if account is active
   * @throws {PaymentError} If Stripe API call fails
   */
  async isAccountActive(stripeAccountId) {
    try {
      const account = await this.stripe.accounts.retrieve(stripeAccountId);
      return account.details_submitted && account.charges_enabled;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Create a payment intent for a customer
   * 
   * @param {number} amount - Amount in cents
   * @param {string} customerId - Stripe customer ID
   * @param {object} metadata - Additional metadata for payment
   * @param {object} options - Optional payment intent parameters
   * @param {string} options.currency - Currency code (defaults to 'usd')
   * @param {string} options.payment_method - Payment method ID to attach
   * @param {string} options.confirmation_method - Confirmation method ('automatic' or 'manual')
   * @param {boolean} options.confirm - Whether to confirm the payment intent immediately
   * @returns {Promise<object>} Stripe payment intent object
   * @throws {PaymentError} If Stripe API call fails
   */
  async createPaymentIntent(amount, customerId, metadata = {}, options = {}) {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      const paymentIntentParams = {
        amount,
        currency: options.currency || 'usd',
        customer: customerId,
        metadata
      };
      
      // Add optional parameters if provided
      if (options.payment_method) {
        paymentIntentParams.payment_method = options.payment_method;
      }
      
      if (options.confirmation_method) {
        paymentIntentParams.confirmation_method = options.confirmation_method;
      }
      
      if (options.confirm !== undefined) {
        paymentIntentParams.confirm = options.confirm;
      }
      
      const paymentIntent = await this.stripe.paymentIntents.create(paymentIntentParams);
      return paymentIntent;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Create a destination charge (for Stripe Connect)
   * 
   * This creates a charge that is sent directly to a connected account.
   * The platform fee is automatically deducted before the charge reaches the destination.
   * 
   * @param {number} amount - Amount in cents
   * @param {string} customerId - Stripe customer ID
   * @param {string} destination - Stripe Connect account ID (destination)
   * @param {object} metadata - Additional metadata for charge
   * @param {object} options - Optional charge parameters
   * @param {string} options.currency - Currency code (defaults to 'usd')
   * @param {number} options.application_fee_amount - Application fee amount in cents
   * @param {string} options.payment_method - Payment method ID to use
   * @returns {Promise<object>} Stripe charge object
   * @throws {PaymentError} If Stripe API call fails
   */
  async createDestinationCharge(amount, customerId, destination, metadata = {}, options = {}) {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Validate destination
      if (!destination) {
        throw new Error('Destination (Connect account ID) is required');
      }
      
      const chargeParams = {
        amount,
        currency: options.currency || 'usd',
        customer: customerId,
        destination,
        metadata
      };
      
      // Add optional parameters if provided
      if (options.application_fee_amount) {
        chargeParams.application_fee_amount = options.application_fee_amount;
      }
      
      if (options.payment_method) {
        chargeParams.payment_method = options.payment_method;
      }
      
      const charge = await this.stripe.charges.create(chargeParams);
      return charge;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Create a refund for a payment intent
   * 
   * @param {string} paymentIntentId - Stripe payment intent ID
   * @param {string} reason - Refund reason ('duplicate', 'fraudulent', 'requested_by_customer')
   * @param {object} options - Optional refund parameters
   * @param {number} options.amount - Partial refund amount in cents (if not provided, full refund)
   * @param {string} options.charge - Charge ID to refund (alternative to payment_intent)
   * @returns {Promise<object>} Stripe refund object
   * @throws {PaymentError} If Stripe API call fails
   */
  async createRefund(paymentIntentId, reason = 'requested_by_customer', options = {}) {
    try {
      // Validate payment intent ID
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }
      
      // Validate reason
      const validReasons = ['duplicate', 'fraudulent', 'requested_by_customer'];
      if (reason && !validReasons.includes(reason)) {
        throw new Error(`Invalid refund reason. Must be one of: ${validReasons.join(', ')}`);
      }
      
      const refundParams = {
        payment_intent: paymentIntentId,
        reason
      };
      
      // Add optional parameters if provided
      if (options.amount) {
        refundParams.amount = options.amount;
      }
      
      if (options.charge) {
        refundParams.charge = options.charge;
        // If charge is provided, don't use payment_intent
        delete refundParams.payment_intent;
      }
      
      const refund = await this.stripe.refunds.create(refundParams);
      return refund;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Create a payout to a Stripe Connect account
   * 
   * This creates a payout that transfers funds from a connected account to their bank account.
   * 
   * @param {string} stripeAccountId - Stripe Connect account ID
   * @param {number} amount - Amount in cents
   * @param {object} metadata - Additional metadata for payout
   * @param {object} options - Optional payout parameters
   * @param {string} options.currency - Currency code (defaults to 'usd')
   * @param {string} options.method - Payout method ('standard' or 'instant'), defaults to 'standard'
   * @param {string} options.destination - Bank account ID (if not provided, uses default)
   * @returns {Promise<object>} Stripe payout object
   * @throws {PaymentError} If Stripe API call fails
   */
  async createPayout(stripeAccountId, amount, metadata = {}, options = {}) {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Validate stripe account ID
      if (!stripeAccountId) {
        throw new Error('Stripe Connect account ID is required');
      }
      
      const payoutParams = {
        amount,
        currency: options.currency || 'usd',
        metadata
      };
      
      // Add optional parameters if provided
      if (options.method) {
        payoutParams.method = options.method;
      }
      
      if (options.destination) {
        payoutParams.destination = options.destination;
      }
      
      const payout = await this.stripe.payouts.create(payoutParams, {
        stripeAccount: stripeAccountId
      });
      return payout;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }

  /**
   * Create a transfer to a Stripe Connect account
   * 
   * This creates a transfer that moves funds from the platform account to a connected account.
   * 
   * @param {number} amount - Amount in cents
   * @param {string} destination - Stripe Connect account ID (destination)
   * @param {object} metadata - Additional metadata for transfer
   * @param {object} options - Optional transfer parameters
   * @param {string} options.currency - Currency code (defaults to 'usd')
   * @param {string} options.source_transaction - Charge ID to transfer from
   * @param {string} options.transfer_group - Transfer group ID for grouping related transfers
   * @returns {Promise<object>} Stripe transfer object
   * @throws {PaymentError} If Stripe API call fails
   */
  async createTransfer(amount, destination, metadata = {}, options = {}) {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Validate destination
      if (!destination) {
        throw new Error('Destination (Connect account ID) is required');
      }
      
      const transferParams = {
        amount,
        currency: options.currency || 'usd',
        destination,
        metadata
      };
      
      // Add optional parameters if provided
      if (options.source_transaction) {
        transferParams.source_transaction = options.source_transaction;
      }
      
      if (options.transfer_group) {
        transferParams.transfer_group = options.transfer_group;
      }
      
      const transfer = await this.stripe.transfers.create(transferParams);
      return transfer;
    } catch (error) {
      // Handle Stripe errors and convert to PaymentError
      throw handleStripeError(error);
    }
  }
}

module.exports = StripeService;

