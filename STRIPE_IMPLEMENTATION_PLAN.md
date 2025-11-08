# Stripe Integration Step-by-Step Implementation Plan

**Date:** Current  
**Status:** ✅ **Ready to Implement**  
**Mode:** Planning Only - **DO NOT IMPLEMENT**

---

## 📊 Readiness Check

### ✅ **Foundation Readiness**

| Component | Status | Verification |
|-----------|--------|--------------|
| Stripe Configuration | ✅ Ready | Test keys in `.env`, Stripe initialized |
| StripeService Structure | ✅ Ready | 12 method stubs ready |
| Transaction Model | ✅ Ready | Complete with all methods and tests |
| Revenue Calculation | ✅ Ready | All utilities complete and tested |
| Error Handling | ✅ Ready | PaymentError class and errorMiddleware ready |
| Test Infrastructure | ✅ Ready | Stripe mocks and test setup ready |
| Financial Endpoints | ✅ Ready | Dashboard endpoints complete |
| Business Model | ✅ Ready | Stripe fields added |
| License Model | ✅ Ready | Complete with workflow |
| Collection Model | ✅ Ready | Pool revenue logic complete |

**Overall Readiness:** ✅ **100% Ready**

---

## 🎯 Implementation Phases

### **Phase 1: StripeService Methods** (12 methods, 2-3 days)

### **Phase 2: API Endpoints** (8 endpoints, 2-3 days)

### **Phase 3: Webhooks** (1 endpoint, 1 day)

### **Phase 4: Testing & Integration** (1-2 days)

---

## 📋 Phase 1: StripeService Methods Implementation

### **Step 1.1: Customer Management Methods** (Day 1, Morning)

#### **Task 1.1.1: Implement `createCustomer()`**

**Readiness Check:**
- ✅ StripeService file exists: `src/services/stripeService.js`
- ✅ Stripe instance available: `src/config/stripe.js`
- ✅ Method stub exists with TODO comments
- ✅ Business model ready for customer ID storage

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `createCustomer()` method (line ~53)
3. Uncomment the Stripe API call:
   ```javascript
   const customer = await this.stripe.customers.create({
     email,
     metadata: { businessId }
   });
   return customer;
   ```
4. Remove the `throw new Error()` line
5. Add error handling with try-catch
6. Use `handleStripeError()` from `src/utils/errorHandler.js` for Stripe errors
7. Return customer object

**Files to Modify:**
- `src/services/stripeService.js` (update createCustomer method)

**Dependencies:**
- None (can be implemented independently)

**Estimated Time:** 30 minutes

**Testing:**
- Create unit test in `tests/unit/services/stripeService.test.js`
- Test successful customer creation
- Test error handling (invalid email, Stripe API errors)

---

#### **Task 1.1.2: Implement `createPaymentMethod()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe payment methods API available

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `createPaymentMethod()` method (line ~74)
3. Uncomment the Stripe API call:
   ```javascript
   const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
     customer: customerId
   });
   return paymentMethod;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return payment method object

**Files to Modify:**
- `src/services/stripeService.js` (update createPaymentMethod method)

**Dependencies:**
- Customer must exist (use createCustomer first)

**Estimated Time:** 30 minutes

**Testing:**
- Test successful payment method attachment
- Test error handling (invalid payment method, customer not found)

---

### **Step 1.2: Subscription Methods** (Day 1, Afternoon)

#### **Task 1.2.1: Implement `createSubscription()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe subscriptions API available
- ⚠️ **REQUIRES:** Price IDs must be created in Stripe Dashboard first

**Prerequisites:**
- Create products and prices in Stripe Dashboard:
  - Contributor Tier: $15/month → Copy Price ID to `.env` as `STRIPE_PRICE_CONTRIBUTOR`
  - Partner Tier: $50/month → Copy Price ID to `.env` as `STRIPE_PRICE_PARTNER`
  - Equity Partner Tier: $100/month → Copy Price ID to `.env` as `STRIPE_PRICE_EQUITY_PARTNER`

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `createSubscription()` method (line ~95)
3. Uncomment the Stripe API call:
   ```javascript
   const subscription = await this.stripe.subscriptions.create({
     customer: customerId,
     items: [{ price: priceId }],
     metadata
   });
   return subscription;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return subscription object

**Files to Modify:**
- `src/services/stripeService.js` (update createSubscription method)
- `.env` (add Price IDs after creating in Dashboard)

**Dependencies:**
- Customer must exist
- Price IDs must be created in Stripe Dashboard

**Estimated Time:** 1 hour

**Testing:**
- Test successful subscription creation
- Test error handling (invalid price ID, customer not found)

---

#### **Task 1.2.2: Implement `cancelSubscription()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe subscriptions API available

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `cancelSubscription()` method (line ~116)
3. Uncomment the Stripe API call:
   ```javascript
   const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
   return subscription;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return cancelled subscription object

**Files to Modify:**
- `src/services/stripeService.js` (update cancelSubscription method)

**Dependencies:**
- Subscription must exist

**Estimated Time:** 30 minutes

**Testing:**
- Test successful subscription cancellation
- Test error handling (subscription not found, already cancelled)

---

### **Step 1.3: Stripe Connect Methods** (Day 2, Morning)

#### **Task 1.3.1: Implement `createConnectAccount()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe Connect API available
- ⚠️ **REQUIRES:** Stripe Connect must be enabled in Dashboard

**Prerequisites:**
- Enable Stripe Connect in Dashboard:
  1. Go to Stripe Dashboard → Settings → Connect
  2. Enable Stripe Connect
  3. Choose Express accounts
  4. Configure branding (optional)

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `createConnectAccount()` method (line ~133)
3. Uncomment the Stripe API call:
   ```javascript
   const account = await this.stripe.accounts.create({
     type: 'express',
     metadata: { businessId }
   });
   return account;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return account object

**Files to Modify:**
- `src/services/stripeService.js` (update createConnectAccount method)

**Dependencies:**
- Stripe Connect must be enabled in Dashboard

**Estimated Time:** 1 hour

**Testing:**
- Test successful Connect account creation
- Test error handling (Connect not enabled, API errors)

---

#### **Task 1.3.2: Implement `createAccountLink()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe Connect API available
- ⚠️ **REQUIRES:** `FRONTEND_URL` in `.env`

**Prerequisites:**
- Add to `.env`:
  ```bash
  FRONTEND_URL=http://localhost:3000
  ```

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `createAccountLink()` method (line ~154)
3. Uncomment the Stripe API call:
   ```javascript
   const accountLink = await this.stripe.accountLinks.create({
     account: stripeAccountId,
     refresh_url: `${process.env.FRONTEND_URL}/business/stripe/refresh`,
     return_url: `${process.env.FRONTEND_URL}/business/stripe/return`,
     type: 'account_onboarding'
   });
   return accountLink;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return account link object with URL

**Files to Modify:**
- `src/services/stripeService.js` (update createAccountLink method)
- `.env` (add FRONTEND_URL)

**Dependencies:**
- Connect account must exist
- FRONTEND_URL must be in `.env`

**Estimated Time:** 1 hour

**Testing:**
- Test successful account link creation
- Test error handling (invalid account ID, missing FRONTEND_URL)

---

#### **Task 1.3.3: Implement `isAccountActive()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe Connect API available

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `isAccountActive()` method (line ~176)
3. Uncomment the Stripe API call:
   ```javascript
   const account = await this.stripe.accounts.retrieve(stripeAccountId);
   return account.details_submitted && account.charges_enabled;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return boolean (true if account is active)

**Files to Modify:**
- `src/services/stripeService.js` (update isAccountActive method)

**Dependencies:**
- Connect account must exist

**Estimated Time:** 30 minutes

**Testing:**
- Test active account returns true
- Test inactive account returns false
- Test error handling (account not found)

---

### **Step 1.4: Payment Methods** (Day 2, Afternoon)

#### **Task 1.4.1: Implement `createPaymentIntent()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe Payment Intents API available

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `createPaymentIntent()` method (line ~195)
3. Uncomment the Stripe API call:
   ```javascript
   const paymentIntent = await this.stripe.paymentIntents.create({
     amount,
     currency: 'usd',
     customer: customerId,
     metadata
   });
   return paymentIntent;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return payment intent object

**Files to Modify:**
- `src/services/stripeService.js` (update createPaymentIntent method)

**Dependencies:**
- Customer must exist (optional, can be null)

**Estimated Time:** 1 hour

**Testing:**
- Test successful payment intent creation
- Test error handling (invalid amount, customer not found)

---

#### **Task 1.4.2: Implement `createDestinationCharge()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe Charges API available
- ⚠️ **REQUIRES:** Connect account must be active

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `createDestinationCharge()` method (line ~220)
3. Uncomment the Stripe API call:
   ```javascript
   const charge = await this.stripe.charges.create({
     amount,
     currency: 'usd',
     customer: customerId,
     destination,
     metadata
   });
   return charge;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return charge object

**Files to Modify:**
- `src/services/stripeService.js` (update createDestinationCharge method)

**Dependencies:**
- Customer must exist
- Connect account must be active

**Estimated Time:** 1 hour

**Testing:**
- Test successful destination charge creation
- Test error handling (invalid destination, inactive account)

---

### **Step 1.5: Refund & Payout Methods** (Day 3, Morning)

#### **Task 1.5.1: Implement `createRefund()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe Refunds API available

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `createRefund()` method (line ~244)
3. Uncomment the Stripe API call:
   ```javascript
   const refund = await this.stripe.refunds.create({
     payment_intent: paymentIntentId,
     reason
   });
   return refund;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return refund object

**Files to Modify:**
- `src/services/stripeService.js` (update createRefund method)

**Dependencies:**
- Payment intent must exist

**Estimated Time:** 1 hour

**Testing:**
- Test successful refund creation
- Test error handling (payment intent not found, already refunded)

---

#### **Task 1.5.2: Implement `createPayout()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe Payouts API available
- ⚠️ **REQUIRES:** Connect account must be active with available balance

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `createPayout()` method (line ~266)
3. Uncomment the Stripe API call:
   ```javascript
   const payout = await this.stripe.payouts.create({
     amount,
     currency: 'usd',
     metadata
   }, {
     stripeAccount: stripeAccountId
   });
   return payout;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return payout object

**Files to Modify:**
- `src/services/stripeService.js` (update createPayout method)

**Dependencies:**
- Connect account must be active
- Account must have available balance

**Estimated Time:** 1 hour

**Testing:**
- Test successful payout creation
- Test error handling (insufficient balance, inactive account)

---

#### **Task 1.5.3: Implement `createTransfer()`**

**Readiness Check:**
- ✅ Method stub exists
- ✅ Stripe Transfers API available
- ⚠️ **REQUIRES:** Connect account must be active

**Implementation Steps:**
1. Open `src/services/stripeService.js`
2. Locate `createTransfer()` method (line ~292)
3. Uncomment the Stripe API call:
   ```javascript
   const transfer = await this.stripe.transfers.create({
     amount,
     currency: 'usd',
     destination,
     metadata
   });
   return transfer;
   ```
4. Remove the `throw new Error()` line
5. Add error handling
6. Return transfer object

**Files to Modify:**
- `src/services/stripeService.js` (update createTransfer method)

**Dependencies:**
- Connect account must be active

**Estimated Time:** 1 hour

**Testing:**
- Test successful transfer creation
- Test error handling (invalid destination, inactive account)

---

## 📋 Phase 2: API Endpoints Implementation

### **Step 2.1: Stripe Connect Endpoints** (Day 4, Morning)

#### **Task 2.1.1: Create Connect Onboarding Endpoint**

**Readiness Check:**
- ✅ StripeService methods ready (createConnectAccount, createAccountLink)
- ✅ Business model ready (stripeConnectAccountId field exists)
- ✅ Routes structure exists: `src/routes/businessRoutes.js`
- ✅ Controllers structure exists: `src/controllers/businessController.js`

**Implementation Steps:**
1. Open `src/controllers/businessController.js`
2. Add new function: `onboardStripeConnect`
3. Implementation:
   ```javascript
   const StripeService = require('../services/stripeService');
   const Business = require('../models/Business');
   
   exports.onboardStripeConnect = async (req, res, next) => {
     try {
       const businessId = req.user.userId; // From authenticate middleware
       const stripeService = new StripeService();
       
       // Check if already onboarded
       const business = await Business.findById(businessId);
       if (business.stripeConnectAccountId) {
         return res.status(400).json({
           success: false,
           error: 'already_onboarded',
           message: 'Stripe Connect account already exists'
         });
       }
       
       // Create Connect account
       const account = await stripeService.createConnectAccount(businessId);
       
       // Create account link
       const accountLink = await stripeService.createAccountLink(account.id, businessId);
       
       // Update Business model
       business.stripeConnectAccountId = account.id;
       business.stripeConnectStatus = 'pending';
       await business.save();
       
       res.json({
         success: true,
         data: {
           accountId: account.id,
           onboardingUrl: accountLink.url
         }
       });
     } catch (error) {
       next(error);
     }
   };
   ```
4. Open `src/routes/businessRoutes.js`
5. Add route:
   ```javascript
   const { onboardStripeConnect } = require('../controllers/businessController');
   router.post('/stripe/connect/onboard', onboardStripeConnect);
   ```

**Files to Create/Modify:**
- `src/controllers/businessController.js` (add onboardStripeConnect function)
- `src/routes/businessRoutes.js` (add route)

**Dependencies:**
- StripeService.createConnectAccount() implemented
- StripeService.createAccountLink() implemented

**Estimated Time:** 2 hours

**Testing:**
- Test successful onboarding
- Test already onboarded error
- Test error handling (Stripe API errors)

---

#### **Task 2.1.2: Create Connect Status Endpoint**

**Readiness Check:**
- ✅ StripeService.isAccountActive() ready
- ✅ Business model ready

**Implementation Steps:**
1. Open `src/controllers/businessController.js`
2. Add new function: `getStripeConnectStatus`
3. Implementation:
   ```javascript
   exports.getStripeConnectStatus = async (req, res, next) => {
     try {
       const businessId = req.user.userId;
       const business = await Business.findById(businessId);
       
       if (!business.stripeConnectAccountId) {
         return res.json({
           success: true,
           data: {
             status: 'not_started',
             accountId: null
           }
         });
       }
       
       const stripeService = new StripeService();
       const isActive = await stripeService.isAccountActive(business.stripeConnectAccountId);
       
       res.json({
         success: true,
         data: {
           status: isActive ? 'active' : business.stripeConnectStatus,
           accountId: business.stripeConnectAccountId
         }
       });
     } catch (error) {
       next(error);
     }
   };
   ```
4. Open `src/routes/businessRoutes.js`
5. Add route:
   ```javascript
   router.get('/stripe/connect/status', getStripeConnectStatus);
   ```

**Files to Modify:**
- `src/controllers/businessController.js` (add getStripeConnectStatus function)
- `src/routes/businessRoutes.js` (add route)

**Dependencies:**
- StripeService.isAccountActive() implemented

**Estimated Time:** 1 hour

**Testing:**
- Test active account status
- Test inactive account status
- Test not started status

---

### **Step 2.2: Subscription Endpoints** (Day 4, Afternoon)

#### **Task 2.2.1: Create Subscription Creation Endpoint**

**Readiness Check:**
- ✅ StripeService methods ready (createCustomer, createPaymentMethod, createSubscription)
- ✅ Subscription controller exists: `src/controllers/subscriptionController.js`
- ✅ Subscription routes exist: `src/routes/subscriptionRoutes.js`
- ✅ Transaction Model ready
- ✅ Revenue calculation utilities ready

**Implementation Steps:**
1. Open `src/controllers/subscriptionController.js`
2. Update `upgradeSubscription` function to use StripeService
3. Implementation:
   ```javascript
   const StripeService = require('../services/stripeService');
   const Transaction = require('../models/Transaction');
   const { calculateStripeFee } = require('../utils/revenueCalculation');
   
   exports.upgradeSubscription = async (req, res, next) => {
     try {
       const businessId = req.user.userId;
       const { tier, paymentMethodId } = req.body;
       
       // Validate tier
       const validTiers = ['contributor', 'partner', 'equityPartner'];
       if (!validTiers.includes(tier)) {
         return res.status(400).json({
           success: false,
           error: 'invalid_tier',
           message: 'Invalid tier specified'
         });
       }
       
       // Get price ID from .env
       const priceId = process.env[`STRIPE_PRICE_${tier.toUpperCase()}`];
       if (!priceId) {
         return res.status(500).json({
           success: false,
           error: 'price_not_configured',
           message: 'Subscription price not configured'
         });
       }
       
       const business = await Business.findById(businessId);
       const stripeService = new StripeService();
       
       // Create or get customer
       let customerId = business.stripeCustomerId;
       if (!customerId) {
         const customer = await stripeService.createCustomer(businessId, business.email);
         customerId = customer.id;
         business.stripeCustomerId = customerId;
       }
       
       // Attach payment method
       await stripeService.createPaymentMethod(paymentMethodId, customerId);
       
       // Create subscription
       const subscription = await stripeService.createSubscription(customerId, priceId, {
         businessId,
         tier
       });
       
       // Calculate transaction amounts
       const tierConfig = require('../config/tiers')[tier];
       const grossAmount = tierConfig.monthlyPrice;
       const stripeFee = calculateStripeFee(grossAmount);
       const netAmount = grossAmount - stripeFee;
       
       // Create transaction record
       const transaction = await Transaction.create({
         type: 'subscription_payment',
         grossAmount,
         stripeFee,
         netAmount,
         platformShare: netAmount, // Platform keeps all subscription revenue
         creatorShare: 0,
         status: 'completed',
         stripePaymentIntentId: subscription.latest_invoice?.payment_intent,
         stripeChargeId: subscription.latest_invoice?.charge,
         payer: businessId,
         description: `${tier} subscription payment`,
         completedAt: new Date()
       });
       
       // Update business
       business.membershipTier = tier;
       business.subscriptionStatus = 'active';
       business.stripeSubscriptionId = subscription.id;
       business.subscriptionExpiry = new Date(subscription.current_period_end * 1000);
       await business.save();
       
       res.json({
         success: true,
         data: {
           subscription: {
             id: subscription.id,
             status: subscription.status,
             currentPeriodEnd: subscription.current_period_end
           },
           transaction: {
             id: transaction._id,
             amount: grossAmount
           }
         }
       });
     } catch (error) {
       next(error);
     }
   };
   ```

**Files to Modify:**
- `src/controllers/subscriptionController.js` (update upgradeSubscription function)
- `.env` (add Price IDs)

**Dependencies:**
- StripeService methods implemented
- Price IDs created in Stripe Dashboard

**Estimated Time:** 3 hours

**Testing:**
- Test successful subscription creation
- Test customer creation
- Test transaction recording
- Test error handling

---

#### **Task 2.2.2: Create Subscription Cancellation Endpoint**

**Readiness Check:**
- ✅ StripeService.cancelSubscription() ready
- ✅ Subscription controller exists

**Implementation Steps:**
1. Open `src/controllers/subscriptionController.js`
2. Update `cancelSubscription` function to use StripeService
3. Implementation:
   ```javascript
   exports.cancelSubscription = async (req, res, next) => {
     try {
       const businessId = req.user.userId;
       const business = await Business.findById(businessId);
       
       if (!business.stripeSubscriptionId) {
         return res.status(400).json({
           success: false,
           error: 'no_subscription',
           message: 'No active subscription found'
         });
       }
       
       const stripeService = new StripeService();
       const subscription = await stripeService.cancelSubscription(business.stripeSubscriptionId);
       
       // Update business
       business.membershipTier = 'free';
       business.subscriptionStatus = 'cancelled';
       business.subscriptionExpiry = null;
       business.stripeSubscriptionId = null;
       await business.save();
       
       res.json({
         success: true,
         data: {
           subscription: {
             id: subscription.id,
             status: subscription.status
           }
         }
       });
     } catch (error) {
       next(error);
     }
   };
   ```

**Files to Modify:**
- `src/controllers/subscriptionController.js` (update cancelSubscription function)

**Dependencies:**
- StripeService.cancelSubscription() implemented

**Estimated Time:** 2 hours

**Testing:**
- Test successful subscription cancellation
- Test business tier downgrade
- Test error handling

---

### **Step 2.3: License Payment Endpoint** (Day 5, Morning)

#### **Task 2.3.1: Create License Payment Endpoint**

**Readiness Check:**
- ✅ StripeService.createPaymentIntent() or createDestinationCharge() ready
- ✅ License controller exists: `src/controllers/licenseController.js`
- ✅ License routes exist: `src/routes/licenseRoutes.js`
- ✅ Transaction Model ready
- ✅ Revenue calculation utilities ready
- ✅ Business model ready

**Implementation Steps:**
1. Open `src/controllers/licenseController.js`
2. Add new function: `processLicensePayment`
3. Implementation:
   ```javascript
   const StripeService = require('../services/stripeService');
   const Transaction = require('../models/Transaction');
   const { calculateRevenueSplit } = require('../utils/revenueCalculation');
   const { TIER_CONFIG } = require('../config/tiers');
   
   exports.processLicensePayment = async (req, res, next) => {
     try {
       const licenseId = req.params.id;
       const businessId = req.user.userId; // Licensee (payer)
       
       // Get license
       const license = await License.findById(licenseId)
         .populate('licensorId', 'membershipTier stripeConnectAccountId')
         .populate('licenseeId');
       
       if (!license) {
         return res.status(404).json({
           success: false,
           error: 'license_not_found',
           message: 'License not found'
         });
       }
       
       if (license.status !== 'pending') {
         return res.status(400).json({
           success: false,
           error: 'invalid_status',
           message: 'License is not in pending status'
         });
       }
       
       const licensor = license.licensorId;
       const licensee = license.licenseeId;
       const grossAmount = license.price;
       
       // Calculate revenue split
       const tierConfig = TIER_CONFIG[licensor.membershipTier];
       const revenueSplit = calculateRevenueSplit(grossAmount, tierConfig);
       
       const stripeService = new StripeService();
       
       // Create payment intent or destination charge
       let paymentIntent;
       if (licensor.stripeConnectAccountId) {
         // Use destination charge for Connect account
         const charge = await stripeService.createDestinationCharge(
           Math.round(grossAmount * 100), // Convert to cents
           licensee.stripeCustomerId,
           licensor.stripeConnectAccountId,
           {
             licenseId: licenseId.toString(),
             businessId: businessId.toString()
           }
         );
         paymentIntent = { id: charge.payment_intent };
       } else {
         // Use payment intent (platform collects, then transfers)
         paymentIntent = await stripeService.createPaymentIntent(
           Math.round(grossAmount * 100), // Convert to cents
           licensee.stripeCustomerId,
           {
             licenseId: licenseId.toString(),
             businessId: businessId.toString()
           }
         );
       }
       
       // Create transaction record
       const transaction = await Transaction.create({
         type: 'license_payment',
         grossAmount,
         stripeFee: revenueSplit.stripeFee,
         netAmount: revenueSplit.netAmount,
         creatorShare: revenueSplit.creatorShare,
         platformShare: revenueSplit.platformShare,
         status: 'pending',
         stripePaymentIntentId: paymentIntent.id,
         payer: businessId,
         payee: licensor._id,
         relatedLicense: licenseId,
         description: `License payment for ${license.licenseType} license`,
         metadata: {
           licenseType: license.licenseType,
           tier: licensor.membershipTier
         }
       });
       
       // Update license status
       license.status = 'approved';
       license.paymentTransactionId = transaction._id;
       await license.save();
       
       res.json({
         success: true,
         data: {
           paymentIntent: {
             id: paymentIntent.id,
             clientSecret: paymentIntent.client_secret
           },
           transaction: {
             id: transaction._id,
             amount: grossAmount
           }
         }
       });
     } catch (error) {
       next(error);
     }
   };
   ```
4. Open `src/routes/licenseRoutes.js`
5. Add route:
   ```javascript
   router.post('/:id/pay', processLicensePayment);
   ```

**Files to Create/Modify:**
- `src/controllers/licenseController.js` (add processLicensePayment function)
- `src/routes/licenseRoutes.js` (add route)

**Dependencies:**
- StripeService.createPaymentIntent() or createDestinationCharge() implemented
- Revenue calculation utilities (already done)

**Estimated Time:** 4 hours

**Testing:**
- Test successful license payment
- Test revenue split calculation
- Test transaction creation
- Test error handling

---

### **Step 2.4: Refund & Payout Endpoints** (Day 5, Afternoon)

#### **Task 2.4.1: Create Refund Endpoint**

**Readiness Check:**
- ✅ StripeService.createRefund() ready
- ✅ Transaction Model ready
- ✅ Transaction routes exist: `src/routes/transactionRoutes.js`

**Implementation Steps:**
1. Create `src/controllers/transactionController.js` (if not exists)
2. Add function: `processRefund`
3. Implementation:
   ```javascript
   const StripeService = require('../services/stripeService');
   const Transaction = require('../models/Transaction');
   const Business = require('../models/Business');
   
   exports.processRefund = async (req, res, next) => {
     try {
       const transactionId = req.params.id;
       const { reason } = req.body;
       
       // Get transaction
       const transaction = await Transaction.findById(transactionId)
         .populate('payer payee');
       
       if (!transaction) {
         return res.status(404).json({
           success: false,
           error: 'transaction_not_found',
           message: 'Transaction not found'
         });
       }
       
       if (transaction.status !== 'completed') {
         return res.status(400).json({
           success: false,
           error: 'invalid_status',
           message: 'Transaction is not completed'
         });
       }
       
       if (!transaction.stripePaymentIntentId) {
         return res.status(400).json({
           success: false,
           error: 'no_payment_intent',
           message: 'Transaction has no payment intent'
         });
       }
       
       const stripeService = new StripeService();
       const refund = await stripeService.createRefund(
         transaction.stripePaymentIntentId,
         reason || 'requested_by_customer'
       );
       
       // Update transaction
       transaction.status = 'refunded';
       transaction.stripeRefundId = refund.id;
       transaction.refundedAt = new Date();
       await transaction.save();
       
       // Adjust business balances
       if (transaction.payer) {
         const payer = await Business.findById(transaction.payer._id);
         payer.balance += transaction.grossAmount; // Refund full amount
         await payer.save();
       }
       
       if (transaction.payee) {
         const payee = await Business.findById(transaction.payee._id);
         payee.balance -= transaction.creatorShare; // Deduct creator share
         await payee.save();
       }
       
       res.json({
         success: true,
         data: {
           refund: {
             id: refund.id,
             amount: refund.amount / 100
           },
           transaction: {
             id: transaction._id,
             status: transaction.status
           }
         }
       });
     } catch (error) {
       next(error);
     }
   };
   ```
4. Open `src/routes/transactionRoutes.js`
5. Add route:
   ```javascript
   router.post('/:id/refund', processRefund);
   ```

**Files to Create/Modify:**
- `src/controllers/transactionController.js` (add processRefund function)
- `src/routes/transactionRoutes.js` (add route)

**Dependencies:**
- StripeService.createRefund() implemented

**Estimated Time:** 2 hours

**Testing:**
- Test successful refund
- Test transaction status update
- Test business balance adjustment
- Test error handling

---

#### **Task 2.4.2: Create Payout Endpoint**

**Readiness Check:**
- ✅ StripeService.createPayout() ready
- ✅ Transaction Model ready
- ✅ Business model ready

**Implementation Steps:**
1. Open `src/controllers/businessController.js`
2. Add function: `requestPayout`
3. Implementation:
   ```javascript
   exports.requestPayout = async (req, res, next) => {
     try {
       const businessId = req.user.userId;
       const { amount } = req.body;
       
       const business = await Business.findById(businessId);
       
       if (!business.stripeConnectAccountId) {
         return res.status(400).json({
           success: false,
           error: 'no_connect_account',
           message: 'Stripe Connect account not set up'
         });
       }
       
       // Validate minimum payout ($25)
       const MIN_PAYOUT = 25;
       if (amount < MIN_PAYOUT) {
         return res.status(400).json({
           success: false,
           error: 'below_minimum',
           message: `Minimum payout amount is $${MIN_PAYOUT}`
         });
       }
       
       // Check available balance
       if (business.balance < amount) {
         return res.status(400).json({
           success: false,
           error: 'insufficient_balance',
           message: 'Insufficient balance for payout'
         });
       }
       
       const stripeService = new StripeService();
       const payout = await stripeService.createPayout(
         business.stripeConnectAccountId,
         Math.round(amount * 100), // Convert to cents
         {
           businessId: businessId.toString()
         }
       );
       
       // Create transaction record
       const transaction = await Transaction.create({
         type: 'payout',
         grossAmount: amount,
         stripeFee: 0, // Payouts have no fee
         netAmount: amount,
         creatorShare: amount,
         platformShare: 0,
         status: 'pending',
         stripePayoutId: payout.id,
         payee: businessId,
         description: `Payout request for $${amount}`,
         metadata: {
           payoutId: payout.id
         }
       });
       
       // Update business balance
       business.balance -= amount;
       await business.save();
       
       res.json({
         success: true,
         data: {
           payout: {
             id: payout.id,
             amount: amount,
             status: payout.status
           },
           transaction: {
             id: transaction._id
           }
         }
       });
     } catch (error) {
       next(error);
     }
   };
   ```
4. Open `src/routes/businessRoutes.js`
5. Add route:
   ```javascript
   router.post('/payouts/request', requestPayout);
   ```

**Files to Modify:**
- `src/controllers/businessController.js` (add requestPayout function)
- `src/routes/businessRoutes.js` (add route)

**Dependencies:**
- StripeService.createPayout() implemented
- Connect account must be active

**Estimated Time:** 2 hours

**Testing:**
- Test successful payout request
- Test minimum amount validation
- Test insufficient balance error
- Test transaction creation

---

## 📋 Phase 3: Webhooks Implementation

### **Step 3.1: Webhook Endpoint** (Day 6)

#### **Task 3.1.1: Create Webhook Controller**

**Readiness Check:**
- ✅ Stripe webhooks API available
- ⚠️ **REQUIRES:** `STRIPE_WEBHOOK_SECRET` in `.env`

**Prerequisites:**
- Configure webhook in Stripe Dashboard:
  1. Go to Stripe Dashboard → Developers → Webhooks
  2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
  3. Select events to listen to
  4. Copy webhook signing secret to `.env` as `STRIPE_WEBHOOK_SECRET`

**Implementation Steps:**
1. Create `src/controllers/webhookController.js`
2. Add function: `handleStripeWebhook`
3. Implementation:
   ```javascript
   const stripe = require('../config/stripe');
   const Business = require('../models/Business');
   const Transaction = require('../models/Transaction');
   const { calculateStripeFee } = require('../utils/revenueCalculation');
   
   exports.handleStripeWebhook = async (req, res) => {
     const sig = req.headers['stripe-signature'];
     const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
     
     let event;
     
     try {
       // Verify webhook signature
       event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
     } catch (err) {
       console.error('Webhook signature verification failed:', err.message);
       return res.status(400).send(`Webhook Error: ${err.message}`);
     }
     
     // Handle the event
     try {
       switch (event.type) {
         case 'customer.subscription.created':
           await handleSubscriptionCreated(event.data.object);
           break;
         case 'customer.subscription.updated':
           await handleSubscriptionUpdated(event.data.object);
           break;
         case 'customer.subscription.deleted':
           await handleSubscriptionDeleted(event.data.object);
           break;
         case 'invoice.payment_succeeded':
           await handleInvoicePaymentSucceeded(event.data.object);
           break;
         case 'invoice.payment_failed':
           await handleInvoicePaymentFailed(event.data.object);
           break;
         case 'payment_intent.succeeded':
           await handlePaymentIntentSucceeded(event.data.object);
           break;
         case 'payment_intent.payment_failed':
           await handlePaymentIntentFailed(event.data.object);
           break;
         case 'account.updated':
           await handleAccountUpdated(event.data.object);
           break;
         case 'charge.dispute.created':
           await handleDisputeCreated(event.data.object);
           break;
         default:
           console.log(`Unhandled event type: ${event.type}`);
       }
       
       res.json({ received: true });
     } catch (error) {
       console.error('Webhook handler error:', error);
       res.status(500).json({ error: 'Webhook handler failed' });
     }
   };
   
   // Handler functions
   async function handleSubscriptionCreated(subscription) {
     const businessId = subscription.metadata.businessId;
     if (businessId) {
       const business = await Business.findById(businessId);
       if (business) {
         business.membershipTier = subscription.metadata.tier;
         business.subscriptionStatus = 'active';
         business.stripeSubscriptionId = subscription.id;
         business.subscriptionExpiry = new Date(subscription.current_period_end * 1000);
         await business.save();
       }
     }
   }
   
   async function handleInvoicePaymentSucceeded(invoice) {
     const customerId = invoice.customer;
     const business = await Business.findOne({ stripeCustomerId: customerId });
     
     if (business) {
       const grossAmount = invoice.amount_paid / 100;
       const stripeFee = calculateStripeFee(grossAmount);
       const netAmount = grossAmount - stripeFee;
       
       await Transaction.create({
         type: 'subscription_payment',
         grossAmount,
         stripeFee,
         netAmount,
         platformShare: netAmount,
         creatorShare: 0,
         status: 'completed',
         stripePaymentIntentId: invoice.payment_intent,
         stripeChargeId: invoice.charge,
         payer: business._id,
         description: 'Subscription payment',
         completedAt: new Date()
       });
       
       business.subscriptionExpiry = new Date(invoice.period_end * 1000);
       await business.save();
     }
   }
   
   // Add other handler functions...
   ```

**Files to Create:**
- `src/controllers/webhookController.js` (new file)

**Dependencies:**
- Webhook secret in `.env`
- Webhook configured in Stripe Dashboard

**Estimated Time:** 4 hours

**Testing:**
- Test webhook signature verification
- Test each event handler
- Test idempotency (duplicate events)

---

#### **Task 3.1.2: Create Webhook Routes**

**Readiness Check:**
- ✅ Webhook controller ready

**Implementation Steps:**
1. Create `src/routes/webhookRoutes.js`
2. Add route:
   ```javascript
   const express = require('express');
   const router = express.Router();
   const { handleStripeWebhook } = require('../controllers/webhookController');
   
   // Webhook endpoint - NO AUTH (webhooks are signed)
   router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);
   
   module.exports = router;
   ```
3. Open `src/app.js`
4. Add webhook routes (BEFORE body parser middleware):
   ```javascript
   const webhookRoutes = require('./routes/webhookRoutes');
   
   // Webhook routes - must be before body parser
   app.use('/api/webhooks', webhookRoutes);
   
   // Body parser middleware (after webhooks)
   app.use(express.json());
   ```

**Files to Create/Modify:**
- `src/routes/webhookRoutes.js` (new file)
- `src/app.js` (add webhook routes)

**Dependencies:**
- Webhook controller implemented

**Estimated Time:** 1 hour

**Testing:**
- Test webhook endpoint accessibility
- Test webhook signature verification

---

## 📋 Phase 4: Testing & Integration

### **Step 4.1: Unit Tests** (Day 7, Morning)

#### **Task 4.1.1: Create StripeService Tests**

**Implementation Steps:**
1. Create `tests/unit/services/stripeService.test.js`
2. Test each method:
   - Test successful API calls
   - Test error handling
   - Test edge cases
3. Use Stripe mocks from `tests/helpers/stripeMocks.js`

**Estimated Time:** 2 hours

---

### **Step 4.2: Integration Tests** (Day 7, Afternoon)

#### **Task 4.2.1: Create Endpoint Integration Tests**

**Implementation Steps:**
1. Create `tests/integration/stripeConnect.test.js`
2. Create `tests/integration/subscriptionPayment.test.js`
3. Create `tests/integration/licensePayment.test.js`
4. Create `tests/integration/webhooks.test.js`
5. Test complete flows with Stripe test mode

**Estimated Time:** 3 hours

---

### **Step 4.3: End-to-End Testing** (Day 8)

#### **Task 4.3.1: Test Complete Payment Flows**

**Implementation Steps:**
1. Test subscription upgrade flow
2. Test license payment flow
3. Test payout flow
4. Test refund flow
5. Test webhook handling
6. Verify Transaction records created
7. Verify Business balances updated

**Estimated Time:** 4 hours

---

## ✅ Readiness Summary

### **✅ Ready to Implement**

1. **Foundation:** ✅ 100% Complete
   - Transaction Model ✅
   - Revenue Calculation ✅
   - Error Handling ✅
   - Test Infrastructure ✅

2. **Stripe Configuration:** ✅ Complete
   - Test keys in `.env` ✅
   - Stripe initialized ✅
   - StripeService structure ✅

3. **Prerequisites:** ⚠️ **Need Setup**
   - Products & Prices in Dashboard (30 min)
   - Webhook configuration (15 min)
   - Stripe Connect enabled (15 min)
   - Price IDs in `.env` (5 min)
   - Webhook secret in `.env` (5 min)
   - FRONTEND_URL in `.env` (1 min)

### **⏳ Implementation Order**

1. **Day 1:** StripeService Customer & Subscription methods
2. **Day 2:** StripeService Connect & Payment methods
3. **Day 3:** StripeService Refund & Payout methods
4. **Day 4:** API Endpoints (Connect & Subscriptions)
5. **Day 5:** API Endpoints (Payments, Refunds, Payouts)
6. **Day 6:** Webhooks
7. **Day 7:** Testing
8. **Day 8:** Integration & Polish

### **📊 Estimated Timeline**

- **Total:** 7-10 days
- **StripeService Methods:** 2-3 days
- **API Endpoints:** 2-3 days
- **Webhooks:** 1 day
- **Testing:** 1-2 days

---

## 🚨 Important Notes

1. **DO NOT IMPLEMENT** - This is a planning document only
2. **Test in Stripe Test Mode** - Use test keys for all development
3. **Use Stripe CLI** - For local webhook testing
4. **Error Handling** - Always use `handleStripeError()` for Stripe errors
5. **Transaction Records** - Always create Transaction records for payments
6. **Business Balances** - Always update Business balances after transactions
7. **Webhook Idempotency** - Handle duplicate webhook events gracefully

---

**Last Updated:** Current  
**Status:** ✅ Ready to implement (planning complete)  
**Next Step:** Begin Phase 1, Step 1.1.1 when ready to implement

