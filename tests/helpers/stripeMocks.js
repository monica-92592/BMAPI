/**
 * Stripe Mock Objects
 * 
 * Mock functions for Stripe API objects to enable testing without real Stripe API calls.
 * 
 * Provides mocks for:
 * - PaymentIntent
 * - Subscription
 * - Customer
 * - Connect Account
 * - Payout
 * - Refund
 * - Webhook Event
 * 
 * Why This Is Important:
 * - Can test payment flows without real Stripe
 * - Faster tests (no API calls)
 * - Consistent test data
 * - Can simulate errors and edge cases
 * - Ready for integration testing when Stripe added
 * 
 * @module tests/helpers/stripeMocks
 */

/**
 * Create a mock Stripe PaymentIntent object
 * 
 * @param {object} overrides - Properties to override defaults
 * @returns {object} Mock Stripe PaymentIntent object
 * 
 * @example
 * const paymentIntent = createMockPaymentIntent({
 *   id: 'pi_test123',
 *   amount: 10000,
 *   status: 'succeeded'
 * });
 */
function createMockPaymentIntent(overrides = {}) {
  const defaultId = `pi_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  return {
    id: overrides.id || defaultId,
    object: 'payment_intent',
    amount: overrides.amount || 10000, // Amount in cents
    currency: overrides.currency || 'usd',
    status: overrides.status || 'succeeded',
    client_secret: overrides.client_secret || `pi_${defaultId}_secret`,
    customer: overrides.customer || null,
    payment_method: overrides.payment_method || null,
    metadata: overrides.metadata || {},
    created: overrides.created || Math.floor(Date.now() / 1000),
    ...overrides
  };
}

/**
 * Create a mock Stripe Subscription object
 * 
 * @param {object} overrides - Properties to override defaults
 * @returns {object} Mock Stripe Subscription object
 * 
 * @example
 * const subscription = createMockSubscription({
 *   id: 'sub_test123',
 *   customer: 'cus_test123',
 *   status: 'active'
 * });
 */
function createMockSubscription(overrides = {}) {
  const defaultId = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = Math.floor(Date.now() / 1000);
  const periodEnd = now + (30 * 24 * 60 * 60); // 30 days from now
  
  return {
    id: overrides.id || defaultId,
    object: 'subscription',
    customer: overrides.customer || `cus_${Date.now()}`,
    status: overrides.status || 'active',
    current_period_start: overrides.current_period_start || now,
    current_period_end: overrides.current_period_end || periodEnd,
    cancel_at_period_end: overrides.cancel_at_period_end || false,
    items: overrides.items || {
      data: [{
        id: `si_${Date.now()}`,
        price: {
          id: overrides.priceId || `price_${Date.now()}`,
          amount: 1000,
          currency: 'usd'
        }
      }]
    },
    metadata: overrides.metadata || {},
    created: overrides.created || now,
    ...overrides
  };
}

/**
 * Create a mock Stripe Customer object
 * 
 * @param {object} overrides - Properties to override defaults
 * @returns {object} Mock Stripe Customer object
 * 
 * @example
 * const customer = createMockCustomer({
 *   id: 'cus_test123',
 *   email: 'test@example.com'
 * });
 */
function createMockCustomer(overrides = {}) {
  const defaultId = `cus_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  return {
    id: overrides.id || defaultId,
    object: 'customer',
    email: overrides.email || `test_${Date.now()}@example.com`,
    name: overrides.name || null,
    phone: overrides.phone || null,
    metadata: overrides.metadata || {},
    created: overrides.created || Math.floor(Date.now() / 1000),
    ...overrides
  };
}

/**
 * Create a mock Stripe Connect Account object
 * 
 * @param {object} overrides - Properties to override defaults
 * @returns {object} Mock Stripe Account object
 * 
 * @example
 * const account = createMockConnectAccount({
 *   id: 'acct_test123',
 *   charges_enabled: true,
 *   payouts_enabled: true
 * });
 */
function createMockConnectAccount(overrides = {}) {
  const defaultId = `acct_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  return {
    id: overrides.id || defaultId,
    object: 'account',
    type: overrides.type || 'express',
    charges_enabled: overrides.charges_enabled !== undefined ? overrides.charges_enabled : false,
    payouts_enabled: overrides.payouts_enabled !== undefined ? overrides.payouts_enabled : false,
    details_submitted: overrides.details_submitted || false,
    email: overrides.email || null,
    metadata: overrides.metadata || {},
    created: overrides.created || Math.floor(Date.now() / 1000),
    ...overrides
  };
}

/**
 * Create a mock Stripe Payout object
 * 
 * @param {object} overrides - Properties to override defaults
 * @returns {object} Mock Stripe Payout object
 * 
 * @example
 * const payout = createMockPayout({
 *   id: 'po_test123',
 *   amount: 5000,
 *   status: 'paid'
 * });
 */
function createMockPayout(overrides = {}) {
  const defaultId = `po_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = Math.floor(Date.now() / 1000);
  const arrivalDate = now + (2 * 24 * 60 * 60); // 2 days from now
  
  return {
    id: overrides.id || defaultId,
    object: 'payout',
    amount: overrides.amount || 10000, // Amount in cents
    currency: overrides.currency || 'usd',
    status: overrides.status || 'pending',
    arrival_date: overrides.arrival_date || arrivalDate,
    destination: overrides.destination || null,
    metadata: overrides.metadata || {},
    created: overrides.created || now,
    ...overrides
  };
}

/**
 * Create a mock Stripe Refund object
 * 
 * @param {object} overrides - Properties to override defaults
 * @returns {object} Mock Stripe Refund object
 * 
 * @example
 * const refund = createMockRefund({
 *   id: 're_test123',
 *   amount: 5000,
 *   payment_intent: 'pi_test123'
 * });
 */
function createMockRefund(overrides = {}) {
  const defaultId = `re_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  return {
    id: overrides.id || defaultId,
    object: 'refund',
    amount: overrides.amount || 10000, // Amount in cents
    currency: overrides.currency || 'usd',
    status: overrides.status || 'succeeded',
    payment_intent: overrides.payment_intent || `pi_${Date.now()}`,
    reason: overrides.reason || 'requested_by_customer',
    metadata: overrides.metadata || {},
    created: overrides.created || Math.floor(Date.now() / 1000),
    ...overrides
  };
}

/**
 * Create a mock Stripe Webhook Event object
 * 
 * @param {string} eventType - Stripe event type (e.g., 'payment_intent.succeeded')
 * @param {object} eventData - Event data object
 * @param {object} overrides - Additional properties to override defaults
 * @returns {object} Mock Stripe Webhook Event object
 * 
 * @example
 * const event = createMockWebhookEvent(
 *   'payment_intent.succeeded',
 *   { object: createMockPaymentIntent() }
 * );
 */
function createMockWebhookEvent(eventType, eventData = {}, overrides = {}) {
  const defaultId = `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  return {
    id: overrides.id || defaultId,
    object: 'event',
    type: eventType || 'payment_intent.succeeded',
    data: {
      object: eventData.object || {},
      previous_attributes: eventData.previous_attributes || {}
    },
    api_version: overrides.api_version || '2024-11-20.acacia',
    created: overrides.created || Math.floor(Date.now() / 1000),
    livemode: overrides.livemode || false,
    pending_webhooks: overrides.pending_webhooks || 1,
    request: overrides.request || {
      id: `req_${Date.now()}`,
      idempotency_key: null
    },
    ...overrides
  };
}

/**
 * Simulate Stripe webhook signature
 * 
 * Creates a mock webhook signature for testing webhook verification.
 * In production, this would be generated by Stripe using the webhook secret.
 * 
 * @param {string} payload - Webhook payload (JSON string)
 * @param {string} secret - Webhook secret (default: test secret)
 * @returns {string} Mock webhook signature
 * 
 * @example
 * const payload = JSON.stringify(webhookEvent);
 * const signature = simulateWebhookSignature(payload);
 */
function simulateWebhookSignature(payload, secret = 'whsec_test_secret') {
  // In production, Stripe uses HMAC SHA256 to generate signatures
  // For testing, we'll create a simple mock signature
  const crypto = require('crypto');
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
}

module.exports = {
  createMockPaymentIntent,
  createMockSubscription,
  createMockCustomer,
  createMockConnectAccount,
  createMockPayout,
  createMockRefund,
  createMockWebhookEvent,
  simulateWebhookSignature
};

