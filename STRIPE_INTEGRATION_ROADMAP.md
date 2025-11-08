# Stripe Dev Environment Integration Roadmap

**Date:** Current  
**Status:** ✅ **Ready to Proceed**  
**Stripe Configuration:** ✅ Complete (Test keys configured)

---

## 📊 Current Status

### ✅ **What's Already Done**

1. **Stripe Configuration** ✅
   - ✅ Stripe package installed (v19.3.0)
   - ✅ Test keys added to `.env` (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY)
   - ✅ Stripe initialized in `src/config/stripe.js`
   - ✅ StripeService class structure created with 12 method stubs

2. **Foundation Work** ✅
   - ✅ Transaction Model (100% complete, 89 tests)
   - ✅ Revenue Calculation Utilities (100% complete, 99 tests)
   - ✅ Financial Dashboard APIs (100% complete, 33 tests)
   - ✅ Error Handling Infrastructure (100% complete, 31 tests)
   - ✅ Pool Revenue Distribution Logic (100% complete, 37 tests)
   - ✅ Test Infrastructure (Stripe mocks ready)

3. **Documentation** ✅
   - ✅ Revenue calculation documentation
   - ✅ API documentation
   - ✅ Test infrastructure documentation

---

## 🎯 What's Needed to Proceed

### **Priority 1: Implement StripeService Methods** (12 methods)

All methods are currently stubbed and throw errors. They need to be implemented with actual Stripe API calls.

#### **1. Customer Management Methods** (2 methods)

**`createCustomer(businessId, email)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Create Stripe customer with email and businessId in metadata
  - Return customer object
- **Estimated Time:** 30 minutes
- **Dependencies:** None

**`createPaymentMethod(paymentMethodId, customerId)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Attach payment method to customer
  - Return payment method object
- **Estimated Time:** 30 minutes
- **Dependencies:** Customer must exist

---

#### **2. Subscription Methods** (2 methods)

**`createSubscription(customerId, priceId, metadata)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Create subscription with customer and price
  - Add metadata (businessId, tier, etc.)
  - Return subscription object
- **Estimated Time:** 1 hour
- **Dependencies:** 
  - Customer must exist
  - Price IDs must be created in Stripe Dashboard first

**`cancelSubscription(subscriptionId)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Cancel subscription
  - Return cancelled subscription object
- **Estimated Time:** 30 minutes
- **Dependencies:** Subscription must exist

---

#### **3. Stripe Connect Methods** (3 methods)

**`createConnectAccount(businessId)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Create Express Connect account
  - Add businessId to metadata
  - Return account object
- **Estimated Time:** 1 hour
- **Dependencies:** None

**`createAccountLink(stripeAccountId, businessId)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Create account link for onboarding
  - Set refresh_url and return_url (need FRONTEND_URL in .env)
  - Return account link with URL
- **Estimated Time:** 1 hour
- **Dependencies:** 
  - Connect account must exist
  - FRONTEND_URL environment variable needed

**`isAccountActive(stripeAccountId)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Retrieve account
  - Check if details_submitted and charges_enabled
  - Return boolean
- **Estimated Time:** 30 minutes
- **Dependencies:** Connect account must exist

---

#### **4. Payment Methods** (2 methods)

**`createPaymentIntent(amount, customerId, metadata)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Create payment intent with amount (in cents)
  - Set currency to 'usd'
  - Add customer and metadata
  - Return payment intent object
- **Estimated Time:** 1 hour
- **Dependencies:** Customer must exist

**`createDestinationCharge(amount, customerId, destination, metadata)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Create charge with destination (Connect account)
  - Set amount (in cents) and currency
  - Add customer and metadata
  - Return charge object
- **Estimated Time:** 1 hour
- **Dependencies:** 
  - Customer must exist
  - Connect account must be active

---

#### **5. Refund & Payout Methods** (3 methods)

**`createRefund(paymentIntentId, reason)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Create refund for payment intent
  - Set reason (duplicate, fraudulent, requested_by_customer)
  - Return refund object
- **Estimated Time:** 1 hour
- **Dependencies:** Payment intent must exist

**`createPayout(stripeAccountId, amount, metadata)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Create payout to Connect account
  - Set amount (in cents) and currency
  - Add metadata
  - Use stripeAccount parameter for Connect account
  - Return payout object
- **Estimated Time:** 1 hour
- **Dependencies:** 
  - Connect account must be active
  - Account must have available balance

**`createTransfer(amount, destination, metadata)`**
- **Status:** ⏳ Needs implementation
- **What to do:**
  - Uncomment the Stripe API call
  - Create transfer to Connect account
  - Set amount (in cents) and currency
  - Add metadata
  - Return transfer object
- **Estimated Time:** 1 hour
- **Dependencies:** Connect account must be active

---

### **Priority 2: Create API Endpoints** (8 endpoints)

#### **1. Stripe Connect Endpoints** (2 endpoints)

**POST `/api/business/stripe/connect/onboard`**
- **Status:** ⏳ Needs creation
- **What to do:**
  - Create controller method
  - Call `stripeService.createConnectAccount()`
  - Call `stripeService.createAccountLink()`
  - Update Business model with Connect account ID
  - Return account link URL
- **Estimated Time:** 2 hours
- **Dependencies:** StripeService methods implemented

**GET `/api/business/stripe/connect/status`**
- **Status:** ⏳ Needs creation
- **What to do:**
  - Create controller method
  - Call `stripeService.isAccountActive()`
  - Return account status
- **Estimated Time:** 1 hour
- **Dependencies:** StripeService methods implemented

---

#### **2. Subscription Endpoints** (2 endpoints)

**POST `/api/business/subscriptions/create`**
- **Status:** ⏳ Needs creation
- **What to do:**
  - Create controller method
  - Validate tier and payment method
  - Call `stripeService.createCustomer()` if needed
  - Call `stripeService.createPaymentMethod()`
  - Call `stripeService.createSubscription()`
  - Update Business model with customer/subscription IDs
  - Create Transaction record
  - Return subscription object
- **Estimated Time:** 3 hours
- **Dependencies:** 
  - StripeService methods implemented
  - Price IDs created in Stripe Dashboard

**POST `/api/business/subscriptions/cancel`**
- **Status:** ⏳ Needs creation
- **What to do:**
  - Create controller method
  - Call `stripeService.cancelSubscription()`
  - Update Business model (remove subscription ID, downgrade tier)
  - Return cancelled subscription
- **Estimated Time:** 2 hours
- **Dependencies:** StripeService methods implemented

---

#### **3. License Payment Endpoint** (1 endpoint)

**POST `/api/licenses/:id/pay`**
- **Status:** ⏳ Needs creation
- **What to do:**
  - Create controller method
  - Get license details
  - Calculate revenue split using existing utilities
  - Call `stripeService.createPaymentIntent()` or `createDestinationCharge()`
  - Create Transaction record
  - Update Business balances
  - Update License status
  - Return payment intent/client secret
- **Estimated Time:** 4 hours
- **Dependencies:** 
  - StripeService methods implemented
  - Revenue calculation utilities (already done)

---

#### **4. Refund Endpoint** (1 endpoint)

**POST `/api/transactions/:id/refund`**
- **Status:** ⏳ Needs creation
- **What to do:**
  - Create controller method
  - Get transaction details
  - Call `stripeService.createRefund()`
  - Update Transaction status to 'refunded'
  - Adjust Business balances
  - Return refund object
- **Estimated Time:** 2 hours
- **Dependencies:** StripeService methods implemented

---

#### **5. Payout Endpoint** (1 endpoint)

**POST `/api/business/payouts/request`**
- **Status:** ⏳ Needs creation
- **What to do:**
  - Create controller method
  - Validate minimum payout amount ($25)
  - Check Business balance
  - Call `stripeService.createPayout()`
  - Create Transaction record
  - Update Business balance
  - Return payout object
- **Estimated Time:** 2 hours
- **Dependencies:** 
  - StripeService methods implemented
  - Connect account must be active

---

#### **6. Webhook Endpoint** (1 endpoint)

**POST `/api/webhooks/stripe`**
- **Status:** ⏳ Needs creation
- **What to do:**
  - Create controller method
  - Verify webhook signature
  - Handle subscription events:
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`
  - Handle payment events:
    - `payment_intent.succeeded`
    - `payment_intent.payment_failed`
  - Handle Connect events:
    - `account.updated`
  - Handle dispute events:
    - `charge.dispute.created`
  - Update Business model and Transaction records
  - Return 200 status
- **Estimated Time:** 4 hours
- **Dependencies:** 
  - StripeService methods implemented
  - Webhook secret in .env (STRIPE_WEBHOOK_SECRET)

---

### **Priority 3: Stripe Dashboard Setup** (Required)

#### **1. Create Products and Prices**

**Required Products:**
- Contributor Tier: $15/month
- Partner Tier: $50/month
- Equity Partner Tier: $100/month

**Steps:**
1. Go to Stripe Dashboard → Products
2. Create each product
3. Create recurring prices for each
4. Copy Price IDs to `.env`:
   - `STRIPE_PRICE_CONTRIBUTOR=price_xxx`
   - `STRIPE_PRICE_PARTNER=price_xxx`
   - `STRIPE_PRICE_EQUITY_PARTNER=price_xxx`

**Estimated Time:** 30 minutes

---

#### **2. Configure Webhooks**

**Steps:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events to listen to:
   - `customer.subscription.*`
   - `invoice.payment.*`
   - `payment_intent.*`
   - `account.updated`
   - `charge.dispute.created`
4. Copy webhook signing secret to `.env`:
   - `STRIPE_WEBHOOK_SECRET=whsec_xxx`

**Estimated Time:** 15 minutes

---

#### **3. Enable Stripe Connect**

**Steps:**
1. Go to Stripe Dashboard → Settings → Connect
2. Enable Stripe Connect
3. Choose Express accounts
4. Configure branding (optional)

**Estimated Time:** 15 minutes

---

### **Priority 4: Environment Variables** (Required)

Add to `.env`:

```bash
# Stripe Configuration (already done)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# Stripe Price IDs (need to create in Dashboard)
STRIPE_PRICE_CONTRIBUTOR=price_xxx
STRIPE_PRICE_PARTNER=price_xxx
STRIPE_PRICE_EQUITY_PARTNER=price_xxx

# Webhook Secret (need to configure in Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Frontend URL (for Connect onboarding)
FRONTEND_URL=http://localhost:3000
```

---

## 📋 Implementation Checklist

### **Week 1: Core StripeService Methods** (5 days)

**Day 1:**
- [ ] Implement `createCustomer()`
- [ ] Implement `createPaymentMethod()`
- [ ] Implement `createSubscription()`
- [ ] Implement `cancelSubscription()`
- [ ] Write tests for customer/subscription methods

**Day 2:**
- [ ] Implement `createConnectAccount()`
- [ ] Implement `createAccountLink()`
- [ ] Implement `isAccountActive()`
- [ ] Write tests for Connect methods

**Day 3:**
- [ ] Implement `createPaymentIntent()`
- [ ] Implement `createDestinationCharge()`
- [ ] Write tests for payment methods

**Day 4:**
- [ ] Implement `createRefund()`
- [ ] Implement `createPayout()`
- [ ] Implement `createTransfer()`
- [ ] Write tests for refund/payout methods

**Day 5:**
- [ ] Review all StripeService methods
- [ ] Fix any issues
- [ ] Update error handling
- [ ] Integration testing

---

### **Week 2: API Endpoints & Webhooks** (5 days)

**Day 1:**
- [ ] Create Connect onboarding endpoint
- [ ] Create Connect status endpoint
- [ ] Test Connect flow

**Day 2:**
- [ ] Create subscription creation endpoint
- [ ] Create subscription cancellation endpoint
- [ ] Test subscription flow

**Day 3:**
- [ ] Create license payment endpoint
- [ ] Integrate with license approval flow
- [ ] Test license payment flow

**Day 4:**
- [ ] Create refund endpoint
- [ ] Create payout endpoint
- [ ] Test refund/payout flows

**Day 5:**
- [ ] Create webhook endpoint
- [ ] Implement webhook signature verification
- [ ] Handle all webhook events
- [ ] Test webhook handling

---

## 🚀 Quick Start Guide

### **Step 1: Stripe Dashboard Setup** (30 minutes)

1. **Create Products & Prices:**
   - Go to Stripe Dashboard → Products
   - Create 3 products (Contributor, Partner, Equity Partner)
   - Create recurring prices for each
   - Copy Price IDs to `.env`

2. **Configure Webhooks:**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint URL
   - Select events to listen to
   - Copy webhook secret to `.env`

3. **Enable Stripe Connect:**
   - Go to Stripe Dashboard → Settings → Connect
   - Enable Express accounts

---

### **Step 2: Implement StripeService Methods** (2-3 days)

Start with the simplest methods and work your way up:

1. **Day 1:** Customer & Subscription methods
2. **Day 2:** Connect & Payment methods
3. **Day 3:** Refund & Payout methods

---

### **Step 3: Create API Endpoints** (2-3 days)

1. **Day 1:** Connect endpoints
2. **Day 2:** Subscription endpoints
3. **Day 3:** Payment, refund, payout endpoints

---

### **Step 4: Implement Webhooks** (1 day)

1. Create webhook endpoint
2. Implement signature verification
3. Handle all events
4. Test with Stripe CLI

---

## 🧪 Testing Strategy

### **1. Unit Tests for StripeService**

Create `tests/unit/services/stripeService.test.js`:
- Test each method with mocked Stripe responses
- Test error handling
- Test edge cases

### **2. Integration Tests**

Use Stripe test mode:
- Test with real Stripe API (test mode)
- Use Stripe test cards
- Verify Transaction records created
- Verify Business balances updated

### **3. Webhook Testing**

Use Stripe CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger customer.subscription.created
```

---

## 📊 Estimated Timeline

**Total Time:** 7-10 days

- **StripeService Methods:** 2-3 days
- **API Endpoints:** 2-3 days
- **Webhooks:** 1 day
- **Testing & Polish:** 1-2 days
- **Stripe Dashboard Setup:** 1 hour

---

## ✅ Prerequisites Checklist

Before starting implementation:

- [x] Stripe test keys in `.env`
- [x] Stripe package installed
- [x] Stripe initialized in `src/config/stripe.js`
- [x] StripeService structure ready
- [x] Transaction Model complete
- [x] Revenue calculation utilities complete
- [x] Error handling infrastructure complete
- [x] Test infrastructure ready
- [ ] Products and prices created in Stripe Dashboard
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Stripe Connect enabled
- [ ] Price IDs in `.env`
- [ ] Webhook secret in `.env`
- [ ] FRONTEND_URL in `.env`

---

## 🎯 Next Steps

1. **Set up Stripe Dashboard** (30 minutes)
   - Create products and prices
   - Configure webhooks
   - Enable Connect

2. **Start with StripeService methods** (Day 1)
   - Implement `createCustomer()`
   - Implement `createPaymentMethod()`
   - Implement `createSubscription()`

3. **Test each method** as you implement it
   - Use Stripe test mode
   - Verify responses
   - Check error handling

4. **Create API endpoints** (Week 2)
   - Start with Connect endpoints
   - Then subscription endpoints
   - Finally payment/refund/payout endpoints

5. **Implement webhooks** (Final step)
   - Create webhook endpoint
   - Handle all events
   - Test with Stripe CLI

---

## 📝 Notes

- **All foundation work is complete** - You can focus solely on Stripe integration
- **Test infrastructure is ready** - Stripe mocks are available for testing
- **Error handling is ready** - PaymentError class and errorMiddleware are in place
- **Revenue calculation is ready** - All calculation logic is implemented and tested

**You're ready to proceed!** 🚀

---

**Last Updated:** Current  
**Status:** Ready to implement Stripe integration

