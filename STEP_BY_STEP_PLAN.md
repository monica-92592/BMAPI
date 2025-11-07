# Step-by-Step Implementation Plan: Hybrid Media Licensing Platform

**Plan Version:** 4.0 (Updated with Revised Project Plan)  
**Last Updated:** Current  
**Timeline:** 8 weeks to Beta launch  
**Fee Model:** Option C - Proportional fee splitting (fees deducted before split)

## Overview

This document provides detailed step-by-step plans for implementing the Hybrid Media Licensing Platform.

**Current Status:**
- ✅ Phase 1: Foundation & Business Model (85% complete)
- ✅ Phase 2: Media Licensing System (90% complete)
- ✅ Phase 4: Collections & Pools (70% complete - structure only)
- ❌ Phase 3: Revenue & Transactions (10% complete) - **CRITICAL GAP**

**This Plan Covers:**
1. ✅ Phase 1: Business Model (Already Implemented)
2. ✅ Phase 2: Media Licensing (Already Implemented)
3. 🆕 Phase 3A: Payment Processing Foundation (Weeks 1-2)
4. 🆕 Phase 3B: License Payment Flow (Weeks 3-4)
5. 🆕 Phase 3C: Dashboard & Analytics (Week 5)
6. 🆕 Phase 3D: Pool Revenue Sharing (Week 6)
7. 🆕 Phase 3E: Production Polish (Week 7)
8. 🆕 Phase 4: Launch Preparation (Week 8)

**Business Model:** "Freemium with Fair Use"
- **Free Tier:** 25 uploads, 50 downloads/month, 3 active licenses, 80/20 split
- **Contributor Tier:** Unlimited uploads, 85/15 split, $15/month
- **Partner Tier:** 90/10 split, API access, pool creation, $50/month
- **Equity Partner Tier:** 95/5 split, ownership stake, $100/month or buy-in

**Key Unlock:** Unlimited uploads for Contributor tier ($15/month)

**Note:** This is a planning document only. No implementation should be done until explicitly requested.

---

## ✅ Already Implemented (Do Not Change)

### Phase 1: Foundation & Business Model (85% Complete) ✅

**Status:** Already implemented - DO NOT MODIFY

**Completed:**
- ✅ Business model with 4 tiers
- ✅ User → Business migration
- ✅ Membership tier system
- ✅ Resource limit tracking (uploadCount, downloadCount, activeLicenseCount)
- ✅ Limit enforcement middleware
- ✅ Tier-based access control
- ✅ Subscription management endpoints (structure exists)

**Files Already Created:**
- `src/models/Business.js` - Business schema with all fields
- `src/config/tiers.js` - Tier configuration with Option C fee splitting
- `src/middlewares/auth.js` - Auth middleware with tier checks and limit enforcement
- `src/utils/businessUtils.js` - Business utility functions
- `scripts/migrate-user-to-business.js` - Migration script

---

### Phase 2: Media Licensing System (90% Complete) ✅

**Status:** Already implemented - DO NOT MODIFY

**Completed:**
- ✅ License model and workflow
- ✅ License types (commercial, editorial, exclusive)
- ✅ License status workflow (pending → approved → active → expired)
- ✅ All licensing endpoints
- ✅ Download limit enforcement
- ✅ Active license limit enforcement
- ✅ Media licensing fields

**Files Already Created:**
- `src/models/License.js` - License schema
- `src/models/Media.js` - Media schema with licensing fields
- `src/controllers/licenseController.js` - License controller
- `src/routes/licenseRoutes.js` - License routes

---

### Phase 4: Collections & Pools (70% Complete) ✅

**Status:** Already implemented - DO NOT MODIFY (structure only)

**Completed:**
- ✅ Collection/Pool model
- ✅ Pool types (competitive, complementary)
- ✅ Pool creation (Partner tier only)
- ✅ Pool management endpoints

**Files Already Created:**
- `src/models/Collection.js` - Collection schema
- `src/controllers/collectionController.js` - Collection controller
- `src/routes/collectionRoutes.js` - Collection routes

**Missing:** Pool revenue sharing implementation (Phase 3D)

---

## 🆕 NEW IMPLEMENTATION: Phase 3A-3E & Phase 4 Launch Prep

**Focus:** Payment Processing, Revenue Distribution, Dashboards, Pool Revenue, Production Polish

---

## PHASE 3A: Payment Processing Foundation (Weeks 1-2)

### Week 1: Stripe Setup & Integration

#### Step 3A.1: Stripe Account Configuration (Day 1-2)

**Status:** ❌ Not Started

**Prerequisites:**
- Stripe account (production + test mode)
- Webhook endpoint URL (production)

**Tasks:**

1. **Create Stripe Configuration File**
   - Create `src/config/stripe.js`
   - Initialize Stripe with secret key from environment
   - Export Stripe instance

2. **Create Stripe Service Wrapper**
   - Create `src/services/stripeService.js`
   - Create `StripeService` class
   - Add methods: `createCustomer()`, `createPaymentMethod()`, `createSubscription()`

3. **Set Up Environment Variables**
   - Add to `.env`:
     ```bash
     STRIPE_SECRET_KEY=sk_test_...
     STRIPE_PUBLISHABLE_KEY=pk_test_...
     STRIPE_WEBHOOK_SECRET=whsec_...
     STRIPE_CONNECT_CLIENT_ID=ca_...
     ```
   - Update `env.example` with these variables

4. **Enable Stripe Connect**
   - Log into Stripe Dashboard
   - Navigate to Connect settings
   - Enable Connect platform
   - Get Connect Client ID
   - Configure Connect settings (Express accounts)

5. **Configure Webhook Endpoint**
   - In Stripe Dashboard, go to Webhooks
   - Add endpoint: `https://yourdomain.com/api/webhooks/stripe`
   - Select events to listen for:
     - `customer.subscription.created`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`
     - `payment_intent.succeeded`
     - `charge.refunded`
     - `charge.dispute.created`
     - `payout.paid`
     - `payout.failed`
   - Copy webhook signing secret

6. **Test Stripe Connection**
   - Create test script: `scripts/test-stripe-connection.js`
   - Test API key connection
   - Verify webhook endpoint accessible

**Deliverables:**
- [ ] `src/config/stripe.js` created
- [ ] `src/services/stripeService.js` created
- [ ] Environment variables configured
- [ ] Stripe Connect enabled
- [ ] Webhook endpoint configured
- [ ] Test connection successful

**Files to Create:**
```
src/config/stripe.js
src/services/stripeService.js
scripts/test-stripe-connection.js
```

---

#### Step 3A.2: Create Transaction Model (Day 3-5)

**Status:** ❌ Not Started

**Prerequisites:**
- Business model exists (already done)
- License model exists (already done)

**Tasks:**

1. **Create Transaction Schema**
   - Create `src/models/Transaction.js`
   - Define transaction types enum:
     - `subscription_payment`
     - `license_payment`
     - `payout`
     - `refund`
     - `chargeback`
     - `platform_fee`

2. **Add Amount Fields**
   - `grossAmount: Number` (required)
   - `stripeFee: Number` (required)
   - `netAmount: Number` (required)
   - `creatorShare: Number`
   - `platformShare: Number`

3. **Add Status Field**
   - `status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded', 'disputed'], default: 'pending' }`

4. **Add Stripe References**
   - `stripePaymentIntentId: String`
   - `stripePayoutId: String`
   - `stripeRefundId: String`
   - `stripeChargeId: String`

5. **Add Relationships**
   - `relatedLicense: { type: Schema.Types.ObjectId, ref: 'License' }`
   - `payer: { type: Schema.Types.ObjectId, ref: 'Business' }` (required)
   - `payee: { type: Schema.Types.ObjectId, ref: 'Business' }`

6. **Add Metadata Field**
   - `metadata: Schema.Types.Mixed` (for chargeback reserves, pool info, etc.)

7. **Add Timestamps**
   - `createdAt: Date` (default: Date.now)
   - `completedAt: Date`
   - `refundedAt: Date`

8. **Add Indexes**
   - Index on `payer`
   - Index on `payee`
   - Index on `stripePaymentIntentId`
   - Index on `type`
   - Index on `status`
   - Index on `createdAt`
   - Index on `metadata.collectionId` (for pool transactions)

9. **Add Methods**
   - `calculateRevenueSplit(tierRevenueSplit)` - Calculate splits based on tier
   - `markCompleted()` - Mark transaction as completed
   - `markRefunded()` - Mark transaction as refunded

10. **Add Validation**
    - Validate grossAmount > 0
    - Validate netAmount = grossAmount - stripeFee
    - Validate creatorShare + platformShare = netAmount (if both present)

11. **Create Model Tests**
    - Create `tests/unit/models/Transaction.test.js`
    - Test schema validation
    - Test methods
    - Test relationships

**Deliverables:**
- [ ] Transaction model created
- [ ] All fields defined
- [ ] Methods implemented
- [ ] Indexes added
- [ ] Model tests written and passing

**Files to Create:**
```
src/models/Transaction.js
tests/unit/models/Transaction.test.js
```

---

#### Step 3A.3: Stripe Connect for Creators (Day 6-7)

**Status:** ❌ Not Started

**Prerequisites:**
- Stripe Connect enabled (Step 3A.1)
- Business model exists (already done)

**Tasks:**

1. **Update Business Model**
   - Add to `src/models/Business.js`:
     ```javascript
     // Stripe Connect
     stripeConnectAccountId: String,
     stripeConnectStatus: {
       type: String,
       enum: ['not_started', 'pending', 'active', 'disabled'],
       default: 'not_started'
     },
     stripeConnectOnboardedAt: Date,
     ```

2. **Add Stripe Connect Methods to StripeService**
   - Add to `src/services/stripeService.js`:
     - `createConnectAccount(businessId)` - Create Express account
     - `createAccountLink(stripeAccountId, businessId)` - Generate onboarding URL
     - `isAccountActive(stripeAccountId)` - Check if fully onboarded
     - `retrieveConnectAccount(stripeAccountId)` - Get account details

3. **Create Stripe Connect Controller**
   - Create `src/controllers/stripeController.js`
   - Add `onboardConnect` function:
     - Create or retrieve Connect account
     - Generate onboarding link
     - Update business stripeConnectStatus
     - Return onboarding URL
   - Add `getConnectStatus` function:
     - Check account status
     - Return status and onboarding URL if needed
   - Add `disconnectAccount` function:
     - Disable Connect account
     - Update business status

4. **Create Stripe Connect Routes**
   - Create `src/routes/stripeRoutes.js`
   - Add routes:
     - `POST /api/stripe/connect/onboard` - Start Connect onboarding
     - `GET /api/stripe/connect/status` - Check Connect status
     - `DELETE /api/stripe/connect/disconnect` - Disconnect account
     - `GET /api/stripe/connect/callback` - Handle OAuth return

5. **Add Routes to App**
   - Update `src/app.js`:
     - Import `stripeRoutes`
     - Add route: `app.use('/api/stripe', authenticate, stripeRoutes)`

6. **Create Tests**
   - Create `tests/integration/stripeConnect.test.js`
   - Test onboarding flow
   - Test status checking
   - Test account creation

**Deliverables:**
- [ ] Business model updated with Stripe Connect fields
- [ ] StripeService methods added
- [ ] Stripe Connect controller created
- [ ] Stripe Connect routes created
- [ ] Routes added to app
- [ ] Tests written and passing

**Files to Create/Update:**
```
src/controllers/stripeController.js (NEW)
src/routes/stripeRoutes.js (NEW)
src/models/Business.js (UPDATE - add Stripe Connect fields)
src/services/stripeService.js (UPDATE - add Connect methods)
src/app.js (UPDATE - add routes)
tests/integration/stripeConnect.test.js (NEW)
```

---

### Week 2: Subscription Payment Flow

#### Step 3A.4: Subscription Billing (Day 8-10)

**Status:** ⚠️ Partially Complete (endpoints exist, payment processing missing)

**Prerequisites:**
- Stripe setup complete (Step 3A.1)
- Transaction model created (Step 3A.2)
- Tier configuration exists (already done)

**Tasks:**

1. **Update Business Model**
   - Add to `src/models/Business.js`:
     ```javascript
     // Stripe Customer
     stripeCustomerId: String,
     stripeSubscriptionId: String,
     ```

2. **Update Subscription Controller**
   - Update `src/controllers/subscriptionController.js`:
   - Modify `upgradeSubscription` function:
     - Get tier config (already exists)
     - Create or retrieve Stripe customer
     - Attach payment method
     - Set as default payment method
     - Create Stripe subscription
     - Update business tier and subscription fields
     - Create transaction record
     - Return subscription details

3. **Add Stripe Customer Methods to StripeService**
   - Add to `src/services/stripeService.js`:
     - `createCustomer(email, metadata)` - Create Stripe customer
     - `retrieveCustomer(customerId)` - Get customer
     - `attachPaymentMethod(customerId, paymentMethodId)` - Attach payment method
     - `createSubscription(customerId, priceId, metadata)` - Create subscription
     - `cancelSubscription(subscriptionId)` - Cancel subscription

4. **Update Subscription Routes**
   - Update `POST /api/subscriptions/upgrade` in `src/routes/subscriptionRoutes.js`:
     - Add payment processing
     - Handle payment method attachment
     - Create subscription
     - Record transaction

5. **Create Transaction on Upgrade**
   - In `upgradeSubscription`:
     - Calculate Stripe fee: `(price * 0.029) + 0.30`
     - Calculate net amount: `price - stripeFee`
     - Create Transaction:
       - type: `subscription_payment`
       - grossAmount: tier price
       - stripeFee: calculated fee
       - netAmount: calculated net
       - platformShare: netAmount (all to platform for subscriptions)
       - status: `completed`
       - payer: business._id
       - stripePaymentIntentId: subscription.latest_invoice

6. **Update Business on Upgrade**
   - Set `membershipTier` to new tier
   - Set `subscriptionStatus` to `active`
   - Set `subscriptionExpiry` to subscription period end
   - Set `stripeCustomerId` if new
   - Set `stripeSubscriptionId`
   - Save business

7. **Handle Errors**
   - Payment method attachment failures
   - Subscription creation errors
   - Return user-friendly error messages

8. **Create Tests**
   - Create `tests/integration/subscriptionPayment.test.js`
   - Test subscription upgrade with payment
   - Test customer creation
   - Test payment method attachment
   - Test transaction recording

**Deliverables:**
- [ ] Business model updated with Stripe customer fields
- [ ] Subscription controller updated with payment processing
- [ ] StripeService methods added
- [ ] Subscription routes updated
- [ ] Transaction recording on upgrade
- [ ] Tests written and passing

**Files to Update:**
```
src/models/Business.js (UPDATE - add Stripe customer fields)
src/controllers/subscriptionController.js (UPDATE - add payment processing)
src/services/stripeService.js (UPDATE - add customer/subscription methods)
src/routes/subscriptionRoutes.js (UPDATE - enhance upgrade route)
tests/integration/subscriptionPayment.test.js (NEW)
```

---

#### Step 3A.5: Subscription Webhooks (Day 11-12)

**Status:** ❌ Not Started

**Prerequisites:**
- Webhook endpoint configured (Step 3A.1)
- Transaction model created (Step 3A.2)
- Subscription payment flow working (Step 3A.4)

**Tasks:**

1. **Create Webhook Controller**
   - Create `src/controllers/webhookController.js`
   - Add `handleStripeWebhook` function:
     - Verify webhook signature
     - Parse event
     - Route to appropriate handler
     - Return 200 status

2. **Create Webhook Handlers**
   - Add to `src/controllers/webhookController.js`:
     - `handleSubscriptionCreated(subscription)` - Update business tier
     - `handleInvoicePaymentSucceeded(invoice)` - Record transaction, extend subscription
     - `handleInvoicePaymentFailed(invoice)` - Handle failures, downgrade after 3 attempts
     - `handleSubscriptionDeleted(subscription)` - Downgrade to free tier

3. **Implement Subscription Created Handler**
   - Find business by metadata.businessId
   - Update tier if needed
   - Log event

4. **Implement Invoice Payment Succeeded Handler**
   - Find business by customer ID
   - Create transaction record:
     - type: `subscription_payment`
     - grossAmount: invoice.amount_paid / 100
     - stripeFee: calculate fee
     - netAmount: calculate net
     - platformShare: netAmount
     - status: `completed`
     - payer: business._id
     - stripePaymentIntentId: invoice.payment_intent
   - Update business subscriptionExpiry
   - Save transaction

5. **Implement Invoice Payment Failed Handler**
   - Find business by customer ID
   - Check attempt_count
   - If >= 3 attempts:
     - Downgrade to free tier
     - Set subscriptionStatus to `cancelled`
     - Send notification (TODO: Phase 3E)
   - Log failure

6. **Implement Subscription Deleted Handler**
   - Find business by metadata.businessId
   - Set subscriptionStatus to `cancelled`
   - Set membershipTier to `free`
   - Save business

7. **Create Webhook Routes**
   - Create `src/routes/webhookRoutes.js`
   - Add route: `POST /api/webhooks/stripe`
   - Use `express.raw({ type: 'application/json' })` middleware
   - Call `handleStripeWebhook`

8. **Add Webhook Route to App**
   - Update `src/app.js`:
     - Import `webhookRoutes`
     - Add route: `app.use('/api/webhooks', webhookRoutes)` (NO AUTH - webhooks are signed)

9. **Add Webhook Signature Verification**
   - In `handleStripeWebhook`:
     - Get signature from headers
     - Verify using `stripe.webhooks.constructEvent()`
     - Handle verification errors

10. **Create Tests**
    - Create `tests/integration/webhooks.test.js`
    - Test webhook signature verification
    - Test each webhook handler
    - Test idempotency (handle duplicate events)

**Deliverables:**
- [ ] Webhook controller created
- [ ] All webhook handlers implemented
- [ ] Webhook routes created
- [ ] Signature verification working
- [ ] Tests written and passing

**Files to Create:**
```
src/controllers/webhookController.js (NEW)
src/routes/webhookRoutes.js (NEW)
src/app.js (UPDATE - add webhook routes)
tests/integration/webhooks.test.js (NEW)
```

---

## PHASE 3B: License Payment Flow (Weeks 3-4)

### Week 3: License Purchase & Revenue Split

#### Step 3B.1: License Payment Processing (Day 13-15)

**Status:** ⚠️ Partially Complete (license creation exists, payment missing)

**Prerequisites:**
- Stripe Connect working (Step 3A.3)
- Transaction model created (Step 3A.2)
- License model exists (already done)
- Tier configuration exists (already done)

**Tasks:**

1. **Update License Creation Endpoint**
   - Update `POST /api/licenses` in `src/controllers/licenseController.js`:
   - Modify `createLicenseRequest` function:
     - Add `paymentMethodId` to request body
     - Check licensor has Stripe Connect active
     - Calculate fees and splits (Option C)
     - Create payment intent with destination charge
     - Auto-approve license on payment success
     - Update creator balance
     - Record transaction
     - Add to transaction histories

2. **Add Payment Processing Logic**
   - In `createLicenseRequest`:
     - Get media and licensor (already exists)
     - Check `licensor.stripeConnectStatus === 'active'`
     - Get price from media pricing
     - Calculate Stripe fee: `(price * 0.029) + 0.30`
     - Calculate net amount: `price - stripeFee`
     - Get tier config for licensor
     - Calculate creator share: `(netAmount * tierConfig.revenueSplit.creator) / 100`
     - Calculate platform share: `(netAmount * tierConfig.revenueSplit.platform) / 100`

3. **Create Payment Intent with Destination Charge**
   - Use StripeService:
     - Create payment intent
     - Set `transfer_data.destination` to licensor's Connect account
     - Set `transfer_data.amount` to creator share (in cents)
     - Confirm payment intent
     - Handle payment failures

4. **Auto-Approve License on Payment Success**
   - If payment succeeds:
     - Set license status to `active`
     - Set `approvedAt` to now
     - Calculate expiry date
     - Increment licensee's `activeLicenseCount`
     - Add to media's `activeLicenses` array

5. **Update Creator Balance**
   - Calculate chargeback reserve: `creatorShare * 0.05`
   - Immediate payout: `creatorShare - chargebackReserve`
   - Update licensor:
     - `balance += immediatePayout`
     - `totalEarnings += immediatePayout`
   - Save licensor

6. **Record Transaction**
   - Create Transaction:
     - type: `license_payment`
     - grossAmount: price
     - stripeFee: calculated fee
     - netAmount: calculated net
     - creatorShare: calculated share
     - platformShare: calculated share
     - status: `completed`
     - stripePaymentIntentId: payment intent ID
     - relatedLicense: license._id
     - payer: licensee._id
     - payee: licensor._id
     - metadata: { chargebackReserve, reserveReleaseDate }

7. **Update Transaction Histories**
   - Add transaction to licensee's `transactionHistory`
   - Add transaction to licensor's `transactionHistory`
   - Save both businesses

8. **Handle Errors**
   - Stripe Connect not active
   - Payment method declined
   - Transfer failures
   - Return user-friendly error messages

9. **Create Tests**
   - Create `tests/integration/licensePayment.test.js`
   - Test license purchase with payment
   - Test revenue split calculation (Option C)
   - Test balance updates
   - Test transaction recording
   - Test chargeback reserve

**Deliverables:**
- [ ] License creation updated with payment processing
- [ ] Revenue split calculation (Option C) implemented
- [ ] Stripe Connect transfers working
- [ ] Creator balances updated automatically
- [ ] Transactions recorded
- [ ] Chargeback reserve calculated
- [ ] Tests written and passing

**Files to Update:**
```
src/controllers/licenseController.js (UPDATE - add payment processing)
src/services/stripeService.js (UPDATE - add payment intent methods)
tests/integration/licensePayment.test.js (NEW)
```

---

#### Step 3B.2: Refund Handling (Day 16-17)

**Status:** ❌ Not Started

**Prerequisites:**
- License payment flow working (Step 3B.1)
- Transaction model created (Step 3A.2)

**Tasks:**

1. **Update Business Model**
   - Add to `src/models/Business.js`:
     ```javascript
     balanceStatus: {
       type: String,
       enum: ['positive', 'negative', 'suspended'],
       default: 'positive'
     },
     ```

2. **Create Refund Endpoint**
   - Add to `src/controllers/licenseController.js`:
   - Create `requestRefund` function:
     - Find license by ID
     - Verify licensee is requesting refund
     - Check 14-day refund window
     - Find original transaction
     - Process Stripe refund
     - Reverse revenue split
     - Cancel license
     - Decrement active license count
     - Record refund transaction

3. **Add Refund Route**
   - Add to `src/routes/licenseRoutes.js`:
     - `POST /api/licenses/:id/refund`
     - Middleware: `authenticate`
     - Body: `{ reason: String }`
     - Controller: `requestRefund`

4. **Implement Refund Logic**
   - In `requestRefund`:
     - Check license exists
     - Verify licensee owns license
     - Calculate days since purchase
     - If > 14 days, return error
     - Find transaction with `relatedLicense` and `type: 'license_payment'`
     - Create Stripe refund
     - Reverse creator balance: `licensor.balance -= transaction.creatorShare`
     - Check for negative balance
     - If negative, set `balanceStatus` to `negative` or `suspended`
     - Cancel license: `license.status = 'cancelled'`
     - Decrement: `licensee.activeLicenseCount--`
     - Create refund transaction (negative amounts)
     - Mark original transaction as refunded

5. **Handle Negative Balances**
   - If balance < 0:
     - Set `balanceStatus` to `negative`
     - If balance < -$50:
     - Set `balanceStatus` to `suspended`
     - Prevent new licenses until balance positive

6. **Create Refund Transaction**
   - Create Transaction:
     - type: `refund`
     - grossAmount: `-transaction.grossAmount`
     - stripeFee: 0 (Stripe doesn't refund fees)
     - netAmount: `-transaction.netAmount`
     - creatorShare: `-transaction.creatorShare`
     - platformShare: `-transaction.platformShare`
     - status: `completed`
     - stripeRefundId: refund.id
     - relatedLicense: license._id
     - payer: licensor._id (creator returns money)
     - payee: licensee._id (buyer receives money)
     - metadata: { reason }

7. **Update Original Transaction**
   - Set `status` to `refunded`
   - Set `refundedAt` to now

8. **Create Tests**
   - Create `tests/integration/refund.test.js`
   - Test refund within 14 days
   - Test refund after 14 days (should fail)
   - Test balance reversal
   - Test negative balance handling
   - Test license cancellation

**Deliverables:**
- [ ] Business model updated with balanceStatus
- [ ] Refund endpoint created
- [ ] 14-day refund window enforced
- [ ] Revenue splits reversed
- [ ] Negative balance handling
- [ ] Refund transactions recorded
- [ ] Tests written and passing

**Files to Update:**
```
src/models/Business.js (UPDATE - add balanceStatus)
src/controllers/licenseController.js (UPDATE - add requestRefund)
src/routes/licenseRoutes.js (UPDATE - add refund route)
src/services/stripeService.js (UPDATE - add refund method)
tests/integration/refund.test.js (NEW)
```

---

### Week 4: Payouts & Edge Cases

#### Step 3B.3: Payout System (Day 18-20)

**Status:** ❌ Not Started

**Prerequisites:**
- Stripe Connect working (Step 3A.3)
- Transaction model created (Step 3A.2)
- Business balance tracking exists (already done)

**Tasks:**

1. **Create Payout Controller**
   - Create `src/controllers/payoutController.js`
   - Add `getPayoutHistory` function:
     - Find all transactions with `type: 'payout'` and `payee: business._id`
     - Return sorted by createdAt
   - Add `requestPayout` function:
     - Check minimum $25 balance
     - Check Stripe Connect active
     - Create payout via Stripe Connect
     - Record transaction
     - Deduct from balance

2. **Create Payout Routes**
   - Create `src/routes/payoutRoutes.js`
   - Add routes:
     - `GET /api/payouts` - Get payout history
     - `POST /api/payouts/request` - Request payout
   - Middleware: `authenticate`

3. **Implement Payout Request Logic**
   - In `requestPayout`:
     - Check `business.balance >= 25`
     - Check `business.stripeConnectStatus === 'active'`
     - Create payout via Stripe:
       - Use `stripe.payouts.create()` with Connect account
       - Amount: `business.balance * 100` (convert to cents)
       - Currency: `usd`
       - Metadata: `{ businessId: business._id }`
     - Create transaction:
       - type: `payout`
       - grossAmount: business.balance
       - netAmount: business.balance
       - creatorShare: business.balance
       - status: `pending`
       - stripePayoutId: payout.id
       - payee: business._id
     - Set `business.balance = 0`
     - Save business and transaction

4. **Add Payout Webhook Handlers**
   - Add to `src/controllers/webhookController.js`:
     - `handlePayoutPaid(payout)` - Mark transaction completed
     - `handlePayoutFailed(payout)` - Return money to balance

5. **Implement Payout Paid Handler**
   - Find transaction by `stripePayoutId`
   - Set `status` to `completed`
   - Set `completedAt` to now
   - Save transaction

6. **Implement Payout Failed Handler**
   - Find transaction by `stripePayoutId`
   - Find business by metadata.businessId
   - Return money: `business.balance += transaction.grossAmount`
   - Set transaction `status` to `failed`
   - Save business and transaction

7. **Add Payout Routes to App**
   - Update `src/app.js`:
     - Import `payoutRoutes`
     - Add route: `app.use('/api/payouts', authenticate, payoutRoutes)`

8. **Add Payout Webhook Events**
   - Update webhook handler:
     - Add `payout.paid` case
     - Add `payout.failed` case

9. **Create Tests**
   - Create `tests/integration/payout.test.js`
   - Test payout request with sufficient balance
   - Test payout request with insufficient balance
   - Test payout webhook handlers
   - Test failed payout handling

**Deliverables:**
- [ ] Payout controller created
- [ ] Payout routes created
- [ ] $25 minimum payout enforced
- [ ] Payout via Stripe Connect working
- [ ] Payout status tracking
- [ ] Failed payout handling
- [ ] Tests written and passing

**Files to Create:**
```
src/controllers/payoutController.js (NEW)
src/routes/payoutRoutes.js (NEW)
src/app.js (UPDATE - add payout routes)
src/controllers/webhookController.js (UPDATE - add payout handlers)
tests/integration/payout.test.js (NEW)
```

---

#### Step 3B.4: Chargeback Protection (Day 21-22)

**Status:** ❌ Not Started

**Prerequisites:**
- License payment flow working (Step 3B.1)
- Transaction model created (Step 3A.2)
- Cron job infrastructure

**Tasks:**

1. **Update License Payment Flow**
   - Modify `createLicenseRequest` in `src/controllers/licenseController.js`:
   - After calculating creator share:
     - Calculate chargeback reserve: `creatorShare * 0.05`
     - Immediate payout: `creatorShare - chargebackReserve`
     - Store reserve in transaction metadata:
       - `chargebackReserve`: reserve amount
       - `reserveReleaseDate`: Date.now() + 90 days

2. **Create Chargeback Reserve Cron Job**
   - Create `src/jobs/chargebackReserve.js`
   - Install `node-cron`: `npm install node-cron`
   - Create cron job:
     - Schedule: `0 0 * * *` (midnight daily)
     - Find transactions:
       - `type: 'license_payment'`
       - `status: 'completed'`
       - `metadata.reserveReleased: { $ne: true }`
       - `createdAt: { $lt: 90 days ago }`
     - For each transaction:
       - Release reserve: `creator.balance += metadata.chargebackReserve`
       - Set `metadata.reserveReleased = true`
       - Save transaction and creator

3. **Add Chargeback Webhook Handler**
   - Add to `src/controllers/webhookController.js`:
     - `handleChargeDisputed(charge)` - Handle chargeback

4. **Implement Chargeback Handler**
   - In `handleChargeDisputed`:
     - Find transaction by `stripeChargeId`
     - If not found, return
     - Set transaction `status` to `disputed`
     - Find licensor (creator)
     - Deduct from balance: `licensor.balance -= transaction.creatorShare`
     - Check for negative balance
     - If negative, set `balanceStatus` to `suspended`
     - Cancel related license
     - Save licensor and license

5. **Add Chargeback Webhook Event**
   - Update webhook handler:
     - Add `charge.dispute.created` case

6. **Set Up Cron Job**
   - Update `server.js` or create `src/jobs/index.js`:
     - Import chargeback reserve job
     - Start cron job on server start
     - Handle errors gracefully

7. **Create Tests**
   - Create `tests/integration/chargeback.test.js`
   - Test reserve calculation
   - Test reserve release after 90 days
   - Test chargeback handling
   - Test account suspension

**Deliverables:**
- [ ] Chargeback reserve system (5% held for 90 days)
- [ ] Daily cron job for reserve release
- [ ] Chargeback webhook handling
- [ ] Account suspension on negative balance
- [ ] Tests written and passing

**Files to Create/Update:**
```
src/jobs/chargebackReserve.js (NEW)
src/controllers/licenseController.js (UPDATE - add reserve calculation)
src/controllers/webhookController.js (UPDATE - add chargeback handler)
src/server.js (UPDATE - start cron job)
tests/integration/chargeback.test.js (NEW)
package.json (UPDATE - add node-cron)
```

---

## PHASE 3C: Dashboard & Analytics (Week 5)

### Week 5: Creator & Platform Dashboards

#### Step 3C.1: Creator Financial Dashboard (Day 23-25)

**Status:** ⚠️ Partially Complete (basic stats exist)

**Prerequisites:**
- Transaction model created (Step 3A.2)
- License model exists (already done)
- Business model exists (already done)

**Tasks:**

1. **Create Financial Overview Endpoint**
   - Add to `src/controllers/businessController.js`:
   - Create `getFinancialOverview` function:
     - Get current balance
     - Calculate total earnings (sum of creatorShare from completed transactions)
     - Calculate total spent (sum of grossAmount from payments)
     - Get pending payouts
     - Get active license count
     - Get recent transactions (last 10)
     - Calculate monthly revenue trend (last 12 months)
     - Calculate chargeback reserve
     - Check payout eligibility

2. **Add Financial Overview Route**
   - Add to `src/routes/businessRoutes.js`:
     - `GET /api/business/financial/overview`
     - Middleware: `authenticate`
     - Controller: `getFinancialOverview`

3. **Implement Earnings Calculation**
   - Aggregate transactions:
     - Match: `payee: business._id`, `type: ['license_payment', 'platform_fee']`, `status: 'completed'`
     - Group: sum `creatorShare`
     - Return total

4. **Implement Spent Calculation**
   - Aggregate transactions:
     - Match: `payer: business._id`, `type: ['license_payment', 'subscription_payment']`, `status: 'completed'`
     - Group: sum `grossAmount`
     - Return total

5. **Implement Monthly Revenue Trend**
   - Aggregate transactions:
     - Match: `payee: business._id`, `type: 'license_payment'`, `status: 'completed'`, `createdAt: { $gte: 12 months ago }`
     - Group by year and month
     - Sum `creatorShare` per month
     - Sort by date
     - Return array of { year, month, revenue, count }

6. **Implement Chargeback Reserve Calculation**
   - Aggregate transactions:
     - Match: `payee: business._id`, `type: 'license_payment'`, `status: 'completed'`, `metadata.reserveReleased: { $ne: true }`
     - Project: `reserve = creatorShare * 0.05`
     - Group: sum reserves
     - Return total

7. **Create Transaction History Endpoint**
   - Add to `src/controllers/businessController.js`:
   - Create `getTransactionHistory` function:
     - Find transactions where business is payer or payee
     - Filter by type and status (query params)
     - Paginate (page, limit)
     - Populate relatedLicense, payer, payee
     - Return transactions with pagination info

8. **Add Transaction History Route**
   - Add to `src/routes/businessRoutes.js`:
     - `GET /api/business/transactions`
     - Middleware: `authenticate`
     - Query params: `page`, `limit`, `type`, `status`
     - Controller: `getTransactionHistory`

9. **Create Pool Earnings Endpoint**
   - Add to `src/controllers/businessController.js`:
   - Create `getPoolEarnings` function:
     - Find collections where business is member
     - Extract earnings data from collection.memberEarnings
     - Calculate total pool earnings
     - Return breakdown per pool

10. **Add Pool Earnings Route**
    - Add to `src/routes/businessRoutes.js`:
      - `GET /api/business/pool-earnings`
      - Middleware: `authenticate`
      - Controller: `getPoolEarnings`

11. **Create Tests**
    - Create `tests/integration/financialDashboard.test.js`
    - Test financial overview
    - Test transaction history
    - Test pool earnings
    - Test calculations accuracy

**Deliverables:**
- [ ] Financial overview endpoint
- [ ] Transaction history with filtering
- [ ] Monthly revenue trends
- [ ] Chargeback reserve calculation
- [ ] Pool earnings endpoint
- [ ] Tests written and passing

**Files to Update:**
```
src/controllers/businessController.js (UPDATE - add financial methods)
src/routes/businessRoutes.js (UPDATE - add financial routes)
tests/integration/financialDashboard.test.js (NEW)
```

---

#### Step 3C.2: Platform Analytics (Day 26-27)

**Status:** ❌ Not Started

**Prerequisites:**
- Transaction model created (Step 3A.2)
- Business model exists (already done)
- Admin authentication

**Tasks:**

1. **Add Admin Middleware**
   - Add to `src/middlewares/auth.js`:
     - Create `requireAdmin` function:
       - Check `req.user.isAdmin === true`
       - Return 403 if not admin

2. **Update Business/User Model**
   - Add to `src/models/Business.js` (or User if separate):
     - `isAdmin: { type: Boolean, default: false }`

3. **Create Admin Controller**
   - Create `src/controllers/adminController.js`
   - Add `getPlatformOverview` function:
     - Calculate total revenue breakdown
     - Get active subscriptions by tier
     - Get user metrics
     - Get license statistics
     - Calculate refund rate
     - Calculate chargeback rate

4. **Create Admin Routes**
   - Create `src/routes/adminRoutes.js`
   - Add routes:
     - `GET /api/admin/platform/overview` - Platform overview
     - `GET /api/admin/platform/revenue-trends` - Revenue trends
   - Middleware: `authenticate`, `requireAdmin`

5. **Implement Platform Overview**
   - In `getPlatformOverview`:
     - Aggregate total revenue:
       - Match: `status: 'completed'`, `type: ['license_payment', 'subscription_payment']`
       - Group: sum gross, platform, creator, stripe fees
     - Get subscriptions by tier:
       - Aggregate businesses with `subscriptionStatus: 'active'`
       - Group by `membershipTier`
       - Count per tier
     - Get user metrics:
       - Total businesses
       - Free users count
       - Paid users count
       - Conversion rate
     - Get license statistics:
       - Aggregate licenses by status
       - Count per status
     - Calculate refund rate:
       - Total sales count
       - Refund count
       - Rate = (refunds / sales) * 100
     - Calculate chargeback rate:
       - Disputed transactions count
       - Rate = (disputes / sales) * 100

6. **Implement Revenue Trends**
   - In `getRevenueTrends`:
     - Get period from query (30days or 12months)
     - Aggregate transactions:
       - Match: `status: 'completed'`, `createdAt: { $gte: period start }`
       - Group by day/month
       - Sum gross, platform, transactions count
       - Sort by date
     - Return trends array

7. **Add Admin Routes to App**
   - Update `src/app.js`:
     - Import `adminRoutes`
     - Add route: `app.use('/api/admin', authenticate, requireAdmin, adminRoutes)`

8. **Create Admin User**
   - Create seed script or manual process:
     - Set `isAdmin: true` for one business/user

9. **Create Tests**
   - Create `tests/integration/adminAnalytics.test.js`
   - Test platform overview
   - Test revenue trends
   - Test admin access control

**Deliverables:**
- [ ] Admin middleware created
- [ ] Platform overview dashboard
- [ ] Revenue trends analytics
- [ ] Subscription metrics
- [ ] Refund/chargeback rates
- [ ] Admin-only access control
- [ ] Tests written and passing

**Files to Create/Update:**
```
src/controllers/adminController.js (NEW)
src/routes/adminRoutes.js (NEW)
src/middlewares/auth.js (UPDATE - add requireAdmin)
src/models/Business.js (UPDATE - add isAdmin)
src/app.js (UPDATE - add admin routes)
tests/integration/adminAnalytics.test.js (NEW)
```

---

## PHASE 3D: Pool Revenue Sharing (Week 6)

### Week 6: Complete Pool Licensing & Revenue Distribution

#### Step 3D.1: Pool Licensing Workflow (Day 28-30)

**Status:** ⚠️ Partially Complete (pool structure exists, licensing missing)

**Prerequisites:**
- Collection model exists (already done)
- Stripe Connect working (Step 3A.3)
- Transaction model created (Step 3A.2)
- License model exists (already done)

**Tasks:**

1. **Create Pool License Endpoint**
   - Add to `src/controllers/collectionController.js`:
   - Create `licensePool` function:
     - Get collection by ID
     - Populate media and owners
     - Calculate pool price
     - Verify all pool members have Stripe Connect
     - Process payment
     - Calculate member shares
     - Distribute revenue
     - Create licenses for each media item
     - Record transactions

2. **Add Pool License Route**
   - Add to `src/routes/collectionRoutes.js`:
     - `POST /api/collections/:id/license`
     - Middleware: `authenticate`
     - Body: `{ licenseType, terms, paymentMethodId }`
     - Controller: `licensePool`

3. **Implement Pool Price Calculation**
   - In `licensePool`:
     - Check if collection has pricing for licenseType
     - If yes, use collection pricing
     - If no, sum all media pricing for licenseType
     - Return pool price

4. **Implement Member Share Calculation**
   - In `licensePool`:
     - Count media per creator
     - Calculate total contribution count
     - For each creator:
       - Calculate contribution percent: `(creator media count / total) * 100`
       - Calculate share: `creatorPoolShare * contributionPercent / 100`

5. **Implement Revenue Distribution**
   - In `licensePool`:
     - Calculate fees: `stripeFee = (poolPrice * 0.029) + 0.30`
     - Calculate net: `netAmount = poolPrice - stripeFee`
     - Get pool creator's tier config
     - Calculate platform share: `netAmount * tierConfig.revenueSplit.platform / 100`
     - Calculate creator pool share: `netAmount - platformShare`
     - For each member:
       - Calculate member share
       - Create Stripe transfer to member's Connect account
       - Calculate chargeback reserve
       - Update member balance
       - Create transaction for member

6. **Create Multiple Licenses**
   - In `licensePool`:
     - For each media in collection:
       - Create license:
         - mediaId: media._id
         - licenseeId: buyer._id
         - licensorId: media.ownerId._id
         - licenseType: provided type
         - status: `active`
         - price: `poolPrice / media.length` (for display)
         - metadata: { collectionId, poolLicense: true }
     - Save all licenses
     - Increment buyer's `activeLicenseCount`

7. **Update Collection Earnings**
   - In `licensePool`:
     - Call `collection.updateEarnings(transaction)` for each member transaction
     - Update `collection.totalRevenue`
     - Update `collection.totalLicenses`

8. **Create Pool Revenue Endpoint**
   - Add to `src/controllers/collectionController.js`:
   - Create `getPoolRevenue` function:
     - Get all transactions for collection
     - Calculate totals
     - Breakdown by member
     - Return revenue analytics

9. **Add Pool Revenue Route**
   - Add to `src/routes/collectionRoutes.js`:
     - `GET /api/collections/:id/revenue`
     - Middleware: `authenticate`
     - Controller: `getPoolRevenue`

10. **Create Tests**
    - Create `tests/integration/poolLicensing.test.js`
    - Test pool licensing flow
    - Test revenue distribution
    - Test member share calculation
    - Test multiple license creation

**Deliverables:**
- [ ] Pool licensing endpoint
- [ ] Automatic revenue distribution to pool members
- [ ] Contribution-based splitting
- [ ] Multiple licenses created (one per media item)
- [ ] Pool revenue analytics
- [ ] Tests written and passing

**Files to Update:**
```
src/controllers/collectionController.js (UPDATE - add pool licensing)
src/routes/collectionRoutes.js (UPDATE - add pool license route)
src/models/Collection.js (UPDATE - add updateEarnings method)
tests/integration/poolLicensing.test.js (NEW)
```

---

#### Step 3D.2: Pool Member Earnings Tracking (Day 31-32)

**Status:** ❌ Not Started

**Prerequisites:**
- Pool licensing workflow working (Step 3D.1)
- Collection model exists (already done)

**Tasks:**

1. **Update Collection Model**
   - Add to `src/models/Collection.js`:
     ```javascript
     totalRevenue: { type: Number, default: 0 },
     totalLicenses: { type: Number, default: 0 },
     memberEarnings: [{
       businessId: { type: Schema.Types.ObjectId, ref: 'Business' },
       totalEarned: { type: Number, default: 0 },
       licenseCount: { type: Number, default: 0 },
       contributionPercent: Number
     }],
     ```

2. **Add Update Earnings Method**
   - Add to `src/models/Collection.js`:
     - `updateEarnings(transaction)` method:
       - Update `totalRevenue += transaction.grossAmount`
       - Update `totalLicenses++`
       - Find or create memberEarnings entry
       - Update `totalEarned` and `licenseCount`
       - Save collection

3. **Update Pool Licensing Flow**
   - In `licensePool`:
     - After creating member transactions:
       - Call `collection.updateEarnings(transaction)` for each member
       - Store `contributionPercent` in memberEarnings

4. **Create Pool Earnings Endpoint**
   - Add to `src/controllers/businessController.js`:
   - Create `getPoolEarnings` function:
     - Find collections where business is member
     - Extract earnings from `memberEarnings` array
     - Calculate total pool earnings
     - Return breakdown per pool

5. **Add Pool Earnings Route**
   - Add to `src/routes/businessRoutes.js`:
     - `GET /api/business/pool-earnings`
     - Middleware: `authenticate`
     - Controller: `getPoolEarnings`

6. **Create Tests**
   - Create `tests/integration/poolEarnings.test.js`
   - Test earnings tracking
   - Test member breakdown
   - Test contribution percentages

**Deliverables:**
- [ ] Collection earnings tracking
- [ ] Member earnings breakdown
- [ ] Pool revenue analytics per creator
- [ ] Pool earnings dashboard endpoint
- [ ] Tests written and passing

**Files to Update:**
```
src/models/Collection.js (UPDATE - add earnings tracking)
src/controllers/businessController.js (UPDATE - add pool earnings)
src/routes/businessRoutes.js (UPDATE - add pool earnings route)
tests/integration/poolEarnings.test.js (NEW)
```

---

## PHASE 3E: Production Polish (Week 7)

### Week 7: Testing, Documentation & Launch Prep

#### Step 3E.1: Integration Testing (Day 33-35)

**Status:** ⚠️ Partially Complete (basic tests exist)

**Prerequisites:**
- All Phase 3A-3D implementations complete
- Stripe test mode configured

**Tasks:**

1. **Create Payment Flow Tests**
   - Create `tests/integration/payment-flow.test.js`
   - Test subscription upgrade with payment
   - Test license purchase with revenue split
   - Test refund flow
   - Test payout flow
   - Test pool licensing flow

2. **Create Revenue Split Tests**
   - Create `tests/integration/revenue-split.test.js`
   - Test Option C fee calculation
   - Test revenue splits for all tiers
   - Test chargeback reserve calculation
   - Test pool revenue distribution

3. **Create Webhook Tests**
   - Create `tests/integration/webhook-simulation.test.js`
   - Test webhook signature verification
   - Test each webhook handler
   - Test idempotency
   - Test error handling

4. **Create End-to-End Tests**
   - Create `tests/integration/e2e-payment-flow.test.js`
   - Test complete subscription flow
   - Test complete license purchase flow
   - Test complete refund flow
   - Test complete payout flow

5. **Update Test Setup**
   - Update `tests/setup.js`:
     - Mock Stripe API calls
     - Set up test Stripe keys
     - Configure test webhook secrets

6. **Run All Tests**
   - Run: `npm test`
   - Fix any failing tests
   - Aim for >80% coverage on payment flows

**Deliverables:**
- [ ] End-to-end payment tests
- [ ] Refund flow tests
- [ ] Pool revenue tests
- [ ] Payout tests
- [ ] Webhook simulation tests
- [ ] All tests passing

**Files to Create:**
```
tests/integration/payment-flow.test.js (NEW)
tests/integration/revenue-split.test.js (NEW)
tests/integration/webhook-simulation.test.js (NEW)
tests/integration/e2e-payment-flow.test.js (NEW)
tests/setup.js (UPDATE - add Stripe mocks)
```

---

#### Step 3E.2: Error Handling & Edge Cases (Day 36-37)

**Status:** ⚠️ Partially Complete (basic error handling exists)

**Prerequisites:**
- All payment flows implemented
- Stripe error types understood

**Tasks:**

1. **Create Payment Error Handler**
   - Create `src/utils/errorHandler.js`
   - Create `PaymentError` class:
     - Extends Error
     - Has `code` and `statusCode` properties
   - Create `handleStripeError(error)` function:
     - Translate Stripe errors to user-friendly messages
     - Return PaymentError with appropriate code

2. **Create Global Error Middleware**
   - Create `src/middlewares/errorMiddleware.js`
   - Create `errorHandler(err, req, res, next)` function:
     - Handle Stripe errors
     - Handle PaymentError
     - Handle default errors
     - Return appropriate status codes and messages

3. **Add Error Middleware to App**
   - Update `src/app.js`:
     - Import error middleware
     - Add as last middleware: `app.use(errorHandler)`

4. **Add Error Handling to Controllers**
   - Update payment controllers:
     - Wrap Stripe calls in try-catch
     - Use `handleStripeError` for Stripe errors
     - Return user-friendly error messages

5. **Handle Edge Cases**
   - Payment method declined
   - Network errors
   - Webhook failures
   - Race conditions
   - Negative balances
   - Failed transfers
   - Duplicate webhooks

6. **Create Error Tests**
   - Create `tests/integration/error-handling.test.js`
   - Test Stripe error handling
   - Test payment failures
   - Test network errors
   - Test edge cases

**Deliverables:**
- [ ] Comprehensive error handling
- [ ] User-friendly error messages
- [ ] Stripe error translation
- [ ] Global error middleware
- [ ] Edge case handling
- [ ] Tests written and passing

**Files to Create/Update:**
```
src/utils/errorHandler.js (NEW)
src/middlewares/errorMiddleware.js (NEW)
src/app.js (UPDATE - add error middleware)
src/controllers/* (UPDATE - add error handling)
tests/integration/error-handling.test.js (NEW)
```

---

#### Step 3E.3: Documentation (Day 38-39)

**Status:** ❌ Not Started

**Prerequisites:**
- All implementations complete
- API finalized

**Tasks:**

1. **Create API Documentation**
   - Create `docs/API.md`
   - Document all payment endpoints
   - Include request/response examples
   - Document error codes
   - Document webhook events

2. **Create Developer Guide**
   - Create `docs/DEVELOPER_GUIDE.md`
   - Document Stripe setup
   - Document testing approach
   - Document revenue calculation
   - Document webhook setup

3. **Create Testing Documentation**
   - Create `docs/TESTING.md`
   - Document test setup
   - Document Stripe test cards
   - Document webhook testing
   - Document test coverage

4. **Create Revenue Calculation Guide**
   - Create `docs/REVENUE_CALCULATION.md`
   - Document Option C fee splitting
   - Provide calculation examples
   - Document chargeback reserves
   - Document pool revenue distribution

5. **Update README**
   - Update `README.md`:
     - Add payment processing section
     - Add Stripe setup instructions
     - Add environment variables
     - Add testing instructions

**Deliverables:**
- [ ] Complete API documentation
- [ ] Developer integration guide
- [ ] Testing documentation
- [ ] Revenue calculation examples
- [ ] Updated README

**Files to Create:**
```
docs/API.md (NEW)
docs/DEVELOPER_GUIDE.md (NEW)
docs/TESTING.md (NEW)
docs/REVENUE_CALCULATION.md (NEW)
README.md (UPDATE - add payment section)
```

---

## PHASE 4: Launch Preparation (Week 8)

### Week 8: Beta Launch Readiness

#### Step 4.1: Production Checklist (Day 40-42)

**Status:** ❌ Not Started

**Prerequisites:**
- All Phase 3 implementations complete
- Testing complete

**Tasks:**

1. **Stripe Production Mode**
   - Switch to production API keys
   - Verify webhook endpoints in production
   - Test with real payment methods (small amounts)
   - Verify Connect transfers working

2. **Database Optimization**
   - Add indexes:
     - Business: `stripeCustomerId`, `stripeConnectAccountId`, `membershipTier + subscriptionStatus`
     - Transaction: `payer`, `payee`, `stripePaymentIntentId`, `type + status`, `metadata.collectionId`
     - License: `licenseeId + status`, `licensorId + status`, `status + expiryDate`
   - Verify query performance
   - Test with production data volumes

3. **Monitoring Setup**
   - Set up Stripe webhook monitoring
   - Configure error logging (Sentry/LogRocket)
   - Set up transaction alerts
   - Monitor failed payment rate

4. **Security Audit**
   - Verify webhook signature verification
   - Check no API keys in code
   - Verify rate limiting on payment endpoints
   - Verify HTTPS enforced

**Deliverables:**
- [ ] Production Stripe configured
- [ ] Database optimized
- [ ] Monitoring active
- [ ] Security verified

---

#### Step 4.2: Beta User Testing (Day 43-45)

**Status:** ❌ Not Started

**Prerequisites:**
- Production environment ready
- Beta users recruited

**Tasks:**

1. **Beta Testing Plan**
   - Recruit 10-20 beta users
   - Week 1: Creator onboarding (10 creators)
   - Week 2: Licensing flow (5 license purchases)
   - Week 3: Pool testing (2 pools, 1 pool license)
   - Week 4: Payout testing (2 payout requests)

2. **Feedback Collection**
   - Create feedback endpoint:
     - `POST /api/feedback`
     - Body: `{ category, message, rating }`
   - Collect feedback after each test phase
   - Analyze feedback
   - Fix critical bugs

3. **Success Metrics**
   - 0 failed payments (or < 1%)
   - 0 incorrect revenue splits
   - < 24 hour payout initiation
   - 100% positive feedback on payment flow

**Deliverables:**
- [ ] 10-20 beta users onboarded
- [ ] All payment flows tested with real money
- [ ] Feedback collected and analyzed
- [ ] Critical bugs fixed

---

## 📊 Implementation Checklist

### Phase 3A: Payment Processing Foundation
- [ ] Stripe account configured
- [ ] Transaction model created
- [ ] Stripe Connect integrated
- [ ] Subscription payments working
- [ ] Webhooks handling

### Phase 3B: License Payment Flow
- [ ] License payments working
- [ ] Revenue splits executed
- [ ] Refunds working
- [ ] Payouts working
- [ ] Chargeback protection

### Phase 3C: Dashboard & Analytics
- [ ] Creator financial dashboard
- [ ] Platform analytics
- [ ] Transaction history
- [ ] Revenue trends

### Phase 3D: Pool Revenue Sharing
- [ ] Pool licensing working
- [ ] Revenue distribution working
- [ ] Member earnings tracked

### Phase 3E: Production Polish
- [ ] Integration tests passing
- [ ] Error handling comprehensive
- [ ] Documentation complete

### Phase 4: Launch Preparation
- [ ] Production environment ready
- [ ] Beta users testing
- [ ] Launch criteria met

---

## 🎯 Success Criteria

**Ready for Beta Launch when:**
1. ✅ All Phase 3A-3E complete
2. ✅ Integration tests passing
3. ✅ Beta users successfully transacting
4. ✅ Revenue splits verified accurate
5. ✅ Refunds and payouts working
6. ✅ Error handling comprehensive
7. ✅ Documentation complete
8. ✅ Security audit passed

---

**Last Updated:** Current  
**Next Review:** After Week 1 completion

### Current State
```javascript
User {
  email, password, name
  role: 'user' | 'admin'
  isVerified, verificationToken
}
```

### Target State
```javascript
Business {
  // Basic (from User)
  email, password, name
  
  // Business Profile
  companyName, companyType, industry, specialty
  businessDescription, website, logo
  
  // Membership (Refined Model)
  membershipTier: 'free' | 'contributor' | 'partner' | 'equityPartner'
  subscriptionStatus: 'active' | 'inactive' | 'cancelled'
  subscriptionExpiry, subscriptionStart
  subscriptionPaymentMethod, subscriptionProvider
  
  // Resource Limits (NEW - Refined Model)
  uploadCount: Number (default: 0)
  downloadCount: Number (default: 0)
  activeLicenseCount: Number (default: 0)
  lastUploadReset: Date
  lastDownloadReset: Date
  
  // Financial
  revenueBalance, totalEarnings, totalSpent
  transactionHistory: [Transaction IDs]
  
  // Governance
  votingPower, governanceParticipation
  proposalsCreated: [Proposal IDs]
  votesCast: [Vote IDs]
  
  // Licensing
  mediaPortfolio: [Media IDs]
  licensesAsLicensor: [License IDs]
  licensesAsLicensee: [License IDs]
  
  // Collections
  collectionsOwned: [Collection IDs]
  collectionsMemberOf: [Collection IDs]
}
```

### Step-by-Step Plan

#### Step 1.1: Create New Business Schema
1. Create new file: `src/models/Business.js`
2. Copy User schema as base
3. Add business profile fields:
   - `companyName: String`
   - `companyType: String` (e.g., 'photography', 'design', 'agency')
   - `industry: String`
   - `specialty: String`
   - `businessDescription: String`
   - `website: String` (optional)
   - `logo: String` (URL, optional)
4. Add membership tier fields (Refined Model):
   - `membershipTier: { type: String, enum: ['free', 'contributor', 'partner', 'equityPartner'], default: 'free' }`
   - `subscriptionStatus: { type: String, enum: ['active', 'inactive', 'cancelled'], default: 'active' }`
   - `subscriptionExpiry: Date`
   - `subscriptionStart: Date`
   - `subscriptionPaymentMethod: String` (e.g., 'stripe', 'paypal')
   - `subscriptionProvider: String` (e.g., subscription ID from payment provider)
5. Add resource limit tracking (NEW - Refined Model):
   - `uploadCount: { type: Number, default: 0 }`
   - `downloadCount: { type: Number, default: 0 }`
   - `activeLicenseCount: { type: Number, default: 0 }`
   - `lastUploadReset: Date` (for tracking upload limit resets)
   - `lastDownloadReset: Date` (for monthly download reset)
6. Add financial fields:
   - `revenueBalance: { type: Number, default: 0 }`
   - `totalEarnings: { type: Number, default: 0 }`
   - `totalSpent: { type: Number, default: 0 }`
   - `transactionHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }]`
7. Add governance fields:
   - `votingPower: { type: Number, default: 0 }` (calculated based on tier)
   - `governanceParticipation: { type: Number, default: 0 }` (count of votes/proposals)
   - `proposalsCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }]`
   - `votesCast: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vote' }]`
8. Add licensing fields:
   - `mediaPortfolio: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }]`
   - `licensesAsLicensor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'License' }]`
   - `licensesAsLicensee: [{ type: mongoose.Schema.Types.ObjectId, ref: 'License' }]`
9. Add collection fields:
   - `collectionsOwned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }]`
   - `collectionsMemberOf: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }]`
10. Add indexes for performance:
    - Index on `membershipTier`
    - Index on `companyName` (for search)
    - Index on `industry`
    - Index on `uploadCount` (for limit checking)
    - Index on `downloadCount` (for limit checking)
    - Index on `activeLicenseCount` (for limit checking)
11. Add virtual for calculating voting power:
    - `businessSchema.virtual('calculatedVotingPower').get(function() { ... })`
12. Add method to calculate revenue split percentage (Refined Model):
    - `businessSchema.methods.getRevenueSplit = function() { 
        // Free: { creator: 80, platform: 20 }
        // Contributor: { creator: 85, platform: 15 }
        // Partner: { creator: 90, platform: 10 }
        // Equity Partner: { creator: 95, platform: 5 }
      }`
13. Add method to check upload limit (Refined Model):
    - `businessSchema.methods.canUpload = function() {
        if (this.membershipTier === 'free') {
          return this.uploadCount < 25; // or 50, configurable
        }
        return true; // Unlimited for paid tiers
      }`
14. Add method to check download limit (Refined Model):
    - `businessSchema.methods.canDownload = function() {
        if (this.membershipTier === 'free') {
          // Check if monthly reset needed
          const now = new Date();
          const lastReset = this.lastDownloadReset || this.createdAt;
          const monthDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + 
                           (now.getMonth() - lastReset.getMonth());
          if (monthDiff >= 1) {
            // Reset download count
            this.downloadCount = 0;
            this.lastDownloadReset = now;
          }
          return this.downloadCount < 50;
        }
        return true; // Unlimited for paid tiers
      }`
15. Add method to check active license limit (Refined Model):
    - `businessSchema.methods.canCreateActiveLicense = function() {
        if (this.membershipTier === 'free') {
          return this.activeLicenseCount < 3;
        }
        return true; // Unlimited for paid tiers
      }`

#### Step 1.2: Create Membership Tier Configuration (Refined Model)
1. Create file: `src/config/tiers.js`
2. Define tier configuration object:
   ```javascript
   const TIER_CONFIG = {
     free: {
       name: 'Free',
       price: 0,
       uploadLimit: 25, // or 50, configurable
       downloadLimit: 50, // per month
       activeLicenseLimit: 3,
       revenueSplit: { creator: 80, platform: 20 },
       features: {
         apiAccess: false,
         prioritySupport: false,
         poolCreation: false,
         analytics: false,
         featuredListing: false
       }
     },
     contributor: {
       name: 'Contributor',
       price: 15, // per month
       uploadLimit: null, // Unlimited
       downloadLimit: null, // Unlimited
       activeLicenseLimit: null, // Unlimited
       revenueSplit: { creator: 85, platform: 15 },
       features: {
         apiAccess: false,
         prioritySupport: true,
         poolCreation: false,
         analytics: true,
         featuredListing: true
       }
     },
     partner: {
       name: 'Partner',
       price: 50, // per month
       uploadLimit: null, // Unlimited
       downloadLimit: null, // Unlimited
       activeLicenseLimit: null, // Unlimited
       revenueSplit: { creator: 90, platform: 10 },
       features: {
         apiAccess: true,
         prioritySupport: true,
         poolCreation: true,
         analytics: true,
         featuredListing: true
       }
     },
     equityPartner: {
       name: 'Equity Partner',
       price: 100, // per month or one-time buy-in
       uploadLimit: null, // Unlimited
       downloadLimit: null, // Unlimited
       activeLicenseLimit: null, // Unlimited
       revenueSplit: { creator: 95, platform: 5 },
       features: {
         apiAccess: true,
         prioritySupport: true,
         poolCreation: true,
         analytics: true,
         featuredListing: true,
         ownershipStake: true,
         boardVoting: true
       }
     }
   };
   ```
3. Export tier configuration
4. Add helper functions:
   - `getTierConfig(tier)` - Get tier configuration
   - `getTierLimit(tier, limitType)` - Get specific limit for tier
   - `checkTierFeature(tier, feature)` - Check if tier has feature

#### Step 1.3: Create Migration Script
1. Create file: `scripts/migrate-user-to-business.js`
2. Script should:
   - Read all existing Users
   - Create Business documents with:
     - All User fields copied
     - Default business fields (companyName = name, membershipTier = 'free')
     - Initialize financial fields to 0
     - Initialize resource limits to 0 (uploadCount, downloadCount, activeLicenseCount)
     - Initialize limit reset timestamps (lastUploadReset, lastDownloadReset = createdAt)
     - Initialize arrays to empty
   - Save new Business documents
   - Log migration progress
   - Handle errors gracefully
3. Create rollback script (optional):
   - `scripts/rollback-business-to-user.js`

#### Step 1.4: Update References
1. Update Media model:
   - Change `ownerId` ref from 'User' to 'Business'
   - Add hook to increment Business uploadCount on media creation
2. Update all controllers:
   - Replace `User` imports with `Business`
   - Update queries to use Business model
3. Update auth controller:
   - Change registration to create Business instead of User
   - Update login to use Business model
4. Update seed script:
   - Create Businesses instead of Users
   - Add business profile data
   - Initialize resource limits

#### Step 1.5: Update Business Logic (Refined Model)
1. Add membership tier calculation:
   - Free: default
   - Contributor: $15/month subscription
   - Partner: $50/month subscription
   - Equity Partner: $100/month or $500-1,000 buy-in
2. Add voting power calculation:
   - Free: 1 vote
   - Contributor: 2 votes
   - Partner: 3 votes
   - Equity Partner: 5 votes
3. Add revenue split calculation (Refined Model):
   - Free: 80/20 (creator/platform)
   - Contributor: 85/15 (creator/platform)
   - Partner: 90/10 (creator/platform)
   - Equity Partner: 95/5 (creator/platform)
4. Add limit checking utilities:
   - `checkUploadLimit(business)` - Check if can upload
   - `checkDownloadLimit(business)` - Check if can download (with monthly reset)
   - `checkActiveLicenseLimit(business)` - Check if can create active license
   - `resetDownloadLimit(business)` - Reset download count monthly

#### Step 1.6: Testing
1. Test migration script:
   - Run on test database
   - Verify all users migrated
   - Verify resource limits initialized
   - Verify data integrity
2. Test Business model:
   - Create new business
   - Update business profile
   - Test membership tier changes
   - Test resource limit tracking
   - Test limit checking methods
3. Test references:
   - Verify Media → Business relationship
   - Test queries with populated Business
   - Test upload count increment on media creation

---

## 📋 Summary

### Implementation Status

**Already Implemented (Do Not Modify):**
- ✅ Phase 1: Business Model (85% complete)
- ✅ Phase 2: Media Licensing (90% complete)
- ✅ Phase 4: Collections/Pools structure (70% complete)

**New Implementation Required:**
- 🆕 Phase 3A: Payment Processing Foundation (Weeks 1-2)
- 🆕 Phase 3B: License Payment Flow (Weeks 3-4)
- 🆕 Phase 3C: Dashboard & Analytics (Week 5)
- 🆕 Phase 3D: Pool Revenue Sharing (Week 6)
- 🆕 Phase 3E: Production Polish (Week 7)
- 🆕 Phase 4: Launch Preparation (Week 8)

**Total Timeline:** 8 weeks to Beta launch

---

## 📝 Notes

- All changes should be backward compatible
- Migration scripts should be tested on copy of production data
- Rollback procedures should be documented
- API versioning may be needed for breaking changes
- Consider feature flags for gradual rollout
- **Resource limits are critical** - must be enforced correctly
- **Monthly download reset** must be implemented correctly
- **Upgrade prompts** should be clear and actionable
- **Tier configuration** should be easily configurable
- **Payment processing** is critical path - prioritize Phase 3A-3B

---

**This is a planning document. Implementation should only proceed when explicitly requested.**
