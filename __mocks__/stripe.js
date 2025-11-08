/**
 * Manual Mock for Stripe Module
 * 
 * This mock is used by Jest when 'stripe' is required.
 * It provides mock implementations of all Stripe API methods.
 */

const {
  createMockPaymentIntent,
  createMockSubscription,
  createMockCustomer,
  createMockConnectAccount,
  createMockPayout,
  createMockRefund,
  createMockWebhookEvent
} = require('../tests/helpers/stripeMocks');

// Mock Stripe constructor
function Stripe(secretKey) {
  this.secretKey = secretKey;
  
  // Customers
  this.customers = {
    create: jest.fn((params) => Promise.resolve(createMockCustomer(params))),
    retrieve: jest.fn((id) => Promise.resolve(createMockCustomer({ id }))),
    update: jest.fn((id, params) => Promise.resolve(createMockCustomer({ id, ...params }))),
    del: jest.fn((id) => Promise.resolve({ id, deleted: true }))
  };
  
  // Payment Methods
  this.paymentMethods = {
    attach: jest.fn((id, params) => Promise.resolve({ id, customer: params.customer })),
    detach: jest.fn((id) => Promise.resolve({ id, detached: true }))
  };
  
  // Subscriptions
  this.subscriptions = {
    create: jest.fn((params) => Promise.resolve(createMockSubscription(params))),
    retrieve: jest.fn((id) => Promise.resolve(createMockSubscription({ id }))),
    update: jest.fn((id, params) => Promise.resolve(createMockSubscription({ id, ...params }))),
    cancel: jest.fn((id) => Promise.resolve(createMockSubscription({ id, status: 'canceled' }))),
    del: jest.fn((id) => Promise.resolve({ id, deleted: true }))
  };
  
  // Payment Intents
  this.paymentIntents = {
    create: jest.fn((params) => Promise.resolve(createMockPaymentIntent(params))),
    retrieve: jest.fn((id) => Promise.resolve(createMockPaymentIntent({ id }))),
    update: jest.fn((id, params) => Promise.resolve(createMockPaymentIntent({ id, ...params }))),
    confirm: jest.fn((id) => Promise.resolve(createMockPaymentIntent({ id, status: 'succeeded' })))
  };
  
  // Charges
  this.charges = {
    create: jest.fn((params) => Promise.resolve({
      id: `ch_${Date.now()}`,
      object: 'charge',
      amount: params.amount,
      currency: params.currency || 'usd',
      status: 'succeeded',
      ...params
    }))
  };
  
  // Refunds
  this.refunds = {
    create: jest.fn((params) => Promise.resolve(createMockRefund(params))),
    retrieve: jest.fn((id) => Promise.resolve(createMockRefund({ id })))
  };
  
  // Connect Accounts
  this.accounts = {
    create: jest.fn((params) => Promise.resolve(createMockConnectAccount(params))),
    retrieve: jest.fn((id) => Promise.resolve(createMockConnectAccount({ id }))),
    update: jest.fn((id, params) => Promise.resolve(createMockConnectAccount({ id, ...params })))
  };
  
  // Account Links
  this.accountLinks = {
    create: jest.fn((params) => Promise.resolve({
      object: 'account_link',
      created: Math.floor(Date.now() / 1000),
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      url: `https://connect.stripe.com/setup/s/${params.account}`,
      ...params
    }))
  };
  
  // Payouts
  this.payouts = {
    create: jest.fn((params, options) => Promise.resolve(createMockPayout(params))),
    retrieve: jest.fn((id, options) => Promise.resolve(createMockPayout({ id }))),
    list: jest.fn((params, options) => Promise.resolve({
      object: 'list',
      data: [createMockPayout()],
      has_more: false
    }))
  };
  
  // Transfers
  this.transfers = {
    create: jest.fn((params) => Promise.resolve({
      id: `tr_${Date.now()}`,
      object: 'transfer',
      amount: params.amount,
      currency: params.currency || 'usd',
      destination: params.destination,
      ...params
    }))
  };
  
  // Webhooks
  this.webhooks = {
    constructEvent: jest.fn((payload, signature, secret) => {
      try {
        const event = JSON.parse(payload);
        return createMockWebhookEvent(event.type || 'payment_intent.succeeded', event);
      } catch (err) {
        throw new Error('Invalid webhook payload');
      }
    })
  };
}

module.exports = Stripe;

