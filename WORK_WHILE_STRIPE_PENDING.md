# Work That Can Be Done While Stripe Account is Being Set Up

## ✅ Tasks That Don't Require Stripe

### 1. **Step 3A.2: Create Transaction Model** ⭐ **HIGH PRIORITY**

**Status:** ❌ Not Started  
**Prerequisites:** ✅ Business model exists, ✅ License model exists  
**No Stripe Required:** ✅ Yes - This is pure database schema

**What to Build:**
- Create `src/models/Transaction.js`
- Define all transaction types (subscription_payment, license_payment, payout, refund, chargeback, platform_fee)
- Add all amount fields (grossAmount, stripeFee, netAmount, creatorShare, platformShare)
- Add status workflow (pending → completed → failed → refunded → disputed)
- Add relationships (payer, payee, relatedLicense)
- Add metadata field (for chargeback reserves, pool info)
- Add indexes for performance
- Add methods: `calculateRevenueSplit()`, `markCompleted()`, `markRefunded()`
- Add validation logic
- Create model tests: `tests/unit/models/Transaction.test.js`

**Why This First:**
- Foundation for all payment flows
- Can test revenue split calculations without Stripe
- Needed before any payment processing code

**Estimated Time:** 2-3 days

---

### 2. **Update Business Model with Stripe Fields** ⭐ **HIGH PRIORITY**

**Status:** ❌ Not Started  
**Prerequisites:** ✅ Business model exists  
**No Stripe Required:** ✅ Yes - Just adding fields (won't be used until Stripe is ready)

**What to Build:**
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
  
  // Stripe Customer
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  
  // Balance Status (for refunds/chargebacks)
  balanceStatus: {
    type: String,
    enum: ['positive', 'negative', 'suspended'],
    default: 'positive'
  },
  ```

**Why This:**
- Fields are needed for payment flows
- Can add now, won't break anything
- Ready when Stripe is configured

**Estimated Time:** 30 minutes

---

### 3. **Build Error Handling Infrastructure** ⭐ **MEDIUM PRIORITY**

**Status:** ⚠️ Partially Complete (basic error handling exists)  
**Prerequisites:** None  
**No Stripe Required:** ✅ Yes - Can build framework now

**What to Build:**
- Create `src/utils/errorHandler.js`:
  - `PaymentError` class (extends Error)
  - `handleStripeError(error)` function (will translate Stripe errors later)
  - Error code mappings
- Create `src/middlewares/errorMiddleware.js`:
  - Global error handler middleware
  - Handle PaymentError, Stripe errors, default errors
  - Return user-friendly messages
- Update `src/app.js` to use error middleware
- Create `tests/integration/error-handling.test.js`

**Why This:**
- Foundation for payment error handling
- Can test error structure without Stripe
- Will make payment integration smoother

**Estimated Time:** 1-2 days

---

### 4. **Build Dashboard Structure (Without Data)** ⭐ **MEDIUM PRIORITY**

**Status:** ⚠️ Partially Complete (basic stats exist)  
**Prerequisites:** Transaction model (Step 1)  
**No Stripe Required:** ✅ Yes - Can build endpoints that return empty/zero data

**What to Build:**
- Add to `src/controllers/businessController.js`:
  - `getFinancialOverview()` - Structure ready, will query transactions when they exist
  - `getTransactionHistory()` - Structure ready, will query transactions when they exist
  - `getPoolEarnings()` - Structure ready, will query collections when they exist
- Add routes to `src/routes/businessRoutes.js`:
  - `GET /api/business/financial/overview`
  - `GET /api/business/transactions`
  - `GET /api/business/pool-earnings`
- Create `tests/integration/financialDashboard.test.js` (test with empty data)

**Why This:**
- Endpoints ready when transactions start flowing
- Can test API structure now
- Frontend can start building against these endpoints

**Estimated Time:** 1-2 days

---

### 5. **Create Revenue Split Calculation Utilities** ⭐ **HIGH PRIORITY**

**Status:** ⚠️ Partially Complete (tier config exists)  
**Prerequisites:** Tier configuration exists  
**No Stripe Required:** ✅ Yes - Pure calculation logic

**What to Build:**
- Create `src/utils/revenueCalculation.js`:
  - `calculateRevenueSplit(grossAmount, tier)` - Option C fee splitting
  - `calculateStripeFee(amount)` - 2.9% + $0.30
  - `calculateChargebackReserve(creatorShare)` - 5% reserve
  - `calculatePoolMemberShare(totalShare, contributionPercent)` - Pool distribution
- Create `tests/unit/utils/revenueCalculation.test.js`:
  - Test all tier splits (Free 80/20, Contributor 85/15, Partner 90/10, Equity 95/5)
  - Test Stripe fee calculation
  - Test chargeback reserve calculation
  - Test pool revenue distribution

**Why This:**
- Core business logic
- Can test thoroughly without Stripe
- Will be used in all payment flows

**Estimated Time:** 1 day

---

### 6. **Build Test Infrastructure for Payments** ⭐ **MEDIUM PRIORITY**

**Status:** ⚠️ Partially Complete (basic tests exist)  
**Prerequisites:** Transaction model (Step 1)  
**No Stripe Required:** ✅ Yes - Can mock Stripe

**What to Build:**
- Update `tests/setup.js`:
  - Mock Stripe API calls
  - Create Stripe mock helpers
  - Set up test Stripe keys (dummy values)
- Create `tests/helpers/stripeMocks.js`:
  - Mock payment intent creation
  - Mock subscription creation
  - Mock Connect account creation
  - Mock webhook events
- Create `tests/integration/revenue-split.test.js`:
  - Test Option C fee calculation
  - Test revenue splits for all tiers
  - Test chargeback reserve calculation
  - Test pool revenue distribution

**Why This:**
- Can test payment logic without real Stripe
- Will make integration testing easier
- Can write tests now, run them when Stripe is ready

**Estimated Time:** 1-2 days

---

### 7. **Create Stripe Service Structure (Without Implementation)** ⭐ **LOW PRIORITY**

**Status:** ❌ Not Started  
**Prerequisites:** None  
**No Stripe Required:** ✅ Yes - Can create structure, implement later

**What to Build:**
- Create `src/config/stripe.js`:
  - Export Stripe instance (will initialize when keys are available)
  - Add placeholder for environment variables
- Create `src/services/stripeService.js`:
  - Create `StripeService` class
  - Add method stubs (will implement when Stripe is ready):
    - `createCustomer()`
    - `createPaymentMethod()`
    - `createSubscription()`
    - `createConnectAccount()`
    - `createPaymentIntent()`
    - `createRefund()`
    - `createPayout()`
  - Add TODO comments for implementation

**Why This:**
- Structure ready when Stripe is configured
- Can see what methods are needed
- Easy to implement when Stripe keys are available

**Estimated Time:** 1-2 hours

---

### 8. **Documentation** ⭐ **LOW PRIORITY**

**Status:** ❌ Not Started  
**Prerequisites:** None  
**No Stripe Required:** ✅ Yes

**What to Build:**
- Create `docs/REVENUE_CALCULATION.md`:
  - Document Option C fee splitting
  - Provide calculation examples
  - Document chargeback reserves
  - Document pool revenue distribution
- Create `docs/API.md`:
  - Document payment endpoints (structure)
  - Document error codes
  - Document webhook events (planned)
- Update `README.md`:
  - Add payment processing section (structure)
  - Add environment variables section
  - Add Stripe setup instructions (placeholder)

**Why This:**
- Can document structure now
- Will help with implementation later
- Good reference for team

**Estimated Time:** 1-2 days

---

## 📋 Recommended Work Order

### Week 1 (While Waiting for Stripe):

**Day 1-2:**
1. ✅ **Step 3A.2: Create Transaction Model** (HIGH PRIORITY)
2. ✅ **Update Business Model with Stripe Fields** (HIGH PRIORITY)
3. ✅ **Create Revenue Split Calculation Utilities** (HIGH PRIORITY)

**Day 3-4:**
4. ✅ **Build Error Handling Infrastructure** (MEDIUM PRIORITY)
5. ✅ **Build Dashboard Structure** (MEDIUM PRIORITY)

**Day 5:**
6. ✅ **Build Test Infrastructure for Payments** (MEDIUM PRIORITY)
7. ✅ **Create Stripe Service Structure** (LOW PRIORITY)

**Optional:**
8. ✅ **Documentation** (LOW PRIORITY - can do anytime)

---

## 🎯 What This Achieves

**By the time Stripe is ready, you'll have:**
- ✅ Transaction model ready for payment flows
- ✅ Business model ready for Stripe integration
- ✅ Revenue calculation logic tested and working
- ✅ Error handling framework in place
- ✅ Dashboard endpoints ready (will populate when transactions exist)
- ✅ Test infrastructure ready for payment testing
- ✅ Stripe service structure ready for implementation

**When Stripe is configured, you can:**
- Implement Stripe service methods (1-2 days)
- Connect payment flows to Stripe API (2-3 days)
- Test with real Stripe test mode (1 day)
- **Total: 4-6 days to complete payment integration**

---

## ⚠️ What NOT to Do (Requires Stripe)

**Don't start these until Stripe is ready:**
- ❌ Stripe account configuration (Step 3A.1)
- ❌ Stripe Connect onboarding flow (Step 3A.3)
- ❌ Subscription payment processing (Step 3A.4)
- ❌ License payment processing (Step 3B.1)
- ❌ Webhook handlers (Step 3A.5) - can structure, but can't test
- ❌ Payout system (Step 3B.3) - can structure, but can't test

---

## 📊 Progress Tracking

**Can Start Now:**
- [ ] Transaction model created
- [ ] Business model updated with Stripe fields
- [ ] Revenue calculation utilities created
- [ ] Error handling infrastructure built
- [ ] Dashboard structure created
- [ ] Test infrastructure for payments
- [ ] Stripe service structure created
- [ ] Documentation written

**Waiting for Stripe:**
- [ ] Stripe account configured
- [ ] Stripe Connect enabled
- [ ] Webhook endpoint configured
- [ ] Payment processing implemented
- [ ] Webhook handlers implemented

---

**Last Updated:** Current  
**Next Steps:** Start with Transaction Model (Step 3A.2)

