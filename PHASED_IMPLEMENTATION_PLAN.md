# Phased Implementation Plan: Media Licensing Marketplace

## 🎯 Vision Summary

**Goal:** Transform from simple Media API to Media Licensing Marketplace with Community Governance

**Business Model:** "Freemium with Fair Use" - True free tier with smart limits, natural upgrade path

**Core Philosophy:**
- Businesses retain ownership of their media
- Platform facilitates licensing transactions
- Revenue splits favor creators (80/20 → 95/5 based on tier)
- True free tier with smart resource limits (no barriers, no transaction requirements)
- Unlimited uploads = key unlock for Contributor tier ($15/month)
- Community governance from day one
- Evolve into member-owned co-op

**Membership Tiers:**
- **Free:** $0/month - 25-50 uploads, 50 downloads/month, 3 active licenses, 80/20 split
- **Contributor:** $15/month - **Unlimited uploads**, 85/15 split, priority support, analytics
- **Partner:** $50/month - 90/10 split, API access, pool creation, priority placement
- **Equity Partner:** $100/month or $500-1,000 buy-in - 95/5 split, ownership stake, board voting

---

## 📋 Phase Overview

| Phase | Focus | Duration | Priority |
|-------|-------|----------|----------|
| **Phase 1** | Foundation & Business Model | Week 1-2 | 🔴 Critical |
| **Phase 2** | Media Licensing System | Week 3-4 | 🔴 Critical |
| **Phase 3** | Revenue & Transactions | Week 4-5 | 🔴 Critical |
| **Phase 4** | Collections & Pools | Week 5-6 | 🟡 Important |
| **Phase 5** | Community Governance | Week 6-7 | 🟡 Important |
| **Phase 6** | Advanced Features | Week 7-8 | 🟢 Nice-to-have |

---

## Phase 1: Foundation & Business Model (Week 1-2)

### Goal
Transform User model into Business model with membership tiers and resource limits

### Tasks

#### 1.1 Enhance User → Business Model
- [ ] Add business profile fields (companyName, companyType, industry, specialty)
- [ ] Add membership tier field (free, contributor, partner, equityPartner)
- [ ] Add subscription management (status, expiry, payment, paymentMethod)
- [ ] Add revenue tracking (balance, earnings, spent, totalRevenue)
- [ ] Add resource limit tracking (uploadCount, downloadCount, activeLicenseCount)
- [ ] Add limit reset tracking (lastUploadReset, lastDownloadReset)
- [ ] Add voting power calculation (based on tier)
- [ ] Migration script for existing users (default to free tier)

#### 1.2 Membership Tier System & Configuration
- [ ] Create membership tier configuration object
  - [ ] Free tier: 25-50 uploads, 50 downloads/month, 3 active licenses, 80/20 split, no API access, no priority support, no pool creation
  - [ ] Contributor tier: Unlimited uploads, 85/15 split, $15/month, priority support, advanced analytics, vote on features
  - [ ] Partner tier: 90/10 split, API access, pool creation, priority placement, $50/month
  - [ ] Equity Partner tier: 95/5 split, ownership stake, board voting, $100/month or buy-in
- [ ] Implement tier-based access control middleware
  - [ ] `requireMembershipTier` - Require specific tier
  - [ ] `requirePartnerTier` - Require Partner tier or higher (for API access, pool creation)
  - [ ] `requireContributorTier` - Require Contributor tier or higher (for analytics, priority support)
- [ ] Create tier upgrade/downgrade logic
- [ ] Add subscription management endpoints
- [ ] Add tier limit checking utilities
- [ ] Add API access restriction (Partner tier only)

#### 1.3 Resource Limit Enforcement
- [ ] Create limit enforcement middleware
  - [ ] `checkUploadLimit` - Enforce 25-50 uploads for free tier
  - [ ] `checkDownloadLimit` - Enforce 50 downloads/month for free tier
  - [ ] `checkActiveLicenseLimit` - Enforce 3 active licenses for free tier
- [ ] Create limit tracking utilities
  - [ ] Track upload count per business
  - [ ] Track downloads per month (reset monthly)
  - [ ] Track active licenses count
- [ ] Add limit display endpoints
  - [ ] GET /api/business/limits - Get current limit usage
  - [ ] Show "X/25 uploads used" prominently

#### 1.4 Update Media Model
- [ ] Change ownerId reference from User to Business
- [ ] Add basic licensing fields (isLicensable, title, description, tags)
- [ ] Add upload tracking (increment business uploadCount on create)
- [ ] Migration script for existing media

#### 1.5 Business Profile Endpoints
- [ ] GET /api/business/profile - Get business profile (with limits)
- [ ] PUT /api/business/profile - Update business profile
- [ ] GET /api/business/search - Search businesses
- [ ] GET /api/business/:id - Get public business profile
- [ ] GET /api/business/limits - Get current limit usage
- [ ] GET /api/business/tier - Get tier information and upgrade options

#### 1.6 Subscription Management
- [ ] POST /api/subscriptions/upgrade - Upgrade tier
- [ ] POST /api/subscriptions/downgrade - Downgrade tier
- [ ] GET /api/subscriptions/status - Get subscription status
- [ ] POST /api/subscriptions/cancel - Cancel subscription
- [ ] Handle subscription webhooks (Stripe/PayPal)

### Deliverables
- ✅ Enhanced Business model with all 4 tiers
- ✅ Membership tier system with configuration
- ✅ Resource limit tracking and enforcement
- ✅ Business profile management
- ✅ Updated Media model with Business reference
- ✅ Subscription management endpoints
- ✅ Limit display and upgrade prompts

### Dependencies
- Current User and Media models
- MongoDB connection (already done)
- Payment provider account (for subscriptions)

---

## Phase 2: Media Licensing System (Week 3-4)

### Goal
Build core licensing functionality with tier-based limits

### Tasks

#### 2.1 License Model
- [ ] Create License schema
- [ ] Define license types (commercial, editorial, exclusive)
- [ ] Define license terms (duration, geographic, usage)
- [ ] Create license status workflow (pending, approved, rejected, active, expired)
- [ ] Link license to licensee (Business) and licensor (Business)
- [ ] Track license creation date, approval date, expiry date
- [ ] Track download count (for free tier limit enforcement)

#### 2.2 Media Licensing Fields
- [ ] Add licensing fields to Media model
  - [ ] License types available
  - [ ] Pricing structure (per license type)
  - [ ] Usage restrictions
  - [ ] Copyright information
  - [ ] Ownership model (individual vs pooled)
  - [ ] Is licensable flag
- [ ] Add watermarked preview generation
- [ ] Add preview URL for unlicensed media

#### 2.3 Licensing Endpoints
- [ ] POST /api/licenses - Create license request (check download limit for free tier)
- [ ] GET /api/licenses - List licenses (with filters)
- [ ] GET /api/licenses/:id - Get license details
- [ ] PUT /api/licenses/:id/approve - Approve license (check active license limit for free tier)
- [ ] PUT /api/licenses/:id/reject - Reject license
- [ ] GET /api/media/:id/licenses - Get licenses for media
- [ ] GET /api/business/licenses - Get business licenses (as licensor/licensee)
- [ ] GET /api/business/licenses/active - Get active licenses (for limit checking)
- [ ] GET /api/media/:id/download - Download licensed media (increment download count)

#### 2.4 License Workflow with Limits
- [ ] License request creation
  - [ ] Check download limit for free tier (50/month)
  - [ ] Show upgrade prompt if limit reached
- [ ] License approval/rejection
  - [ ] Check active license limit for free tier (3 active)
  - [ ] Show upgrade prompt if limit reached
- [ ] License activation
  - [ ] Increment active license count
  - [ ] Track license expiry
- [ ] License expiration handling
  - [ ] Decrement active license count on expiry
  - [ ] Notify licensee of expiry
- [ ] License renewal
  - [ ] Check limits again on renewal
- [ ] Download tracking
  - [ ] Increment download count on media download
  - [ ] Reset download count monthly (for free tier)
  - [ ] Enforce 50 downloads/month limit

#### 2.5 Limit Enforcement in Licensing
- [ ] Enforce download limit (50/month for free tier)
  - [ ] Check before creating license request
  - [ ] Check before downloading licensed media
  - [ ] Show "X/50 downloads used this month"
- [ ] Enforce active license limit (3 for free tier)
  - [ ] Check before approving license
  - [ ] Show "X/3 active licenses"
  - [ ] Show upgrade prompt when limit reached
- [ ] Monthly limit reset
  - [ ] Cron job to reset download counts monthly
  - [ ] Update lastDownloadReset timestamp

### Deliverables
- ✅ License model with status workflow
- ✅ Media licensing fields
- ✅ License creation and management
- ✅ License approval workflow
- ✅ Download limit enforcement (50/month for free tier)
- ✅ Active license limit enforcement (3 for free tier)
- ✅ Monthly limit reset system

### Dependencies
- Phase 1 (Business model with limits)
- Enhanced Media model

---

## Phase 3: Revenue & Transactions (Week 4-5)

### Goal
Implement payment processing and revenue distribution

### Tasks

#### 3.1 Transaction Model
- [ ] Create Transaction schema
- [ ] Define transaction types
- [ ] Link transactions to licenses
- [ ] Track revenue splits

#### 3.2 Payment Processing
- [ ] Choose payment provider (Stripe, PayPal, etc.)
- [ ] Integrate payment processing
- [ ] Handle payment webhooks
- [ ] Payment failure handling

#### 3.3 Revenue Distribution
- [ ] Calculate revenue splits based on membership tier
  - [ ] Free: 80/20 (creator/platform)
  - [ ] Contributor: 85/15 (creator/platform)
  - [ ] Partner: 90/10 (creator/platform)
  - [ ] Equity Partner: 95/5 (creator/platform)
- [ ] Implement revenue distribution logic
- [ ] Update business revenue balances
- [ ] Create transaction records
- [ ] Track platform commission (20%, 15%, 10%, 5% based on tier)

#### 3.4 Financial Endpoints
- [ ] GET /api/business/revenue - Get revenue summary
- [ ] GET /api/business/transactions - Get transaction history
- [ ] GET /api/business/balance - Get current balance
- [ ] POST /api/business/withdraw - Request withdrawal (future)

#### 3.5 License Payment Flow
- [ ] Payment on license approval
- [ ] Revenue split calculation
- [ ] Automatic distribution
- [ ] Transaction recording

### Deliverables
- ✅ Transaction model
- ✅ Payment processing integration
- ✅ Revenue distribution system
- ✅ Financial tracking endpoints

### Dependencies
- Phase 2 (License system)
- Payment provider account

---

## Phase 4: Collections & Pools (Week 5-6)

### Goal
Enable media pooling and collective licensing (Partner tier feature)

### Tasks

#### 4.1 Collection/Pool Model
- [ ] Create Collection schema
- [ ] Define pool types (competitive, complementary)
- [ ] Define revenue sharing model for pools
- [ ] Link collections to businesses and media
- [ ] Track pool creator (must be Partner tier or higher)
- [ ] Track pool members and their contributions

#### 4.2 Pool Management (Partner Tier Only)
- [ ] POST /api/collections - Create collection (require Partner tier)
- [ ] PUT /api/collections/:id - Update collection (require ownership or Partner tier)
- [ ] POST /api/collections/:id/media - Add media to pool
- [ ] DELETE /api/collections/:id/media/:mediaId - Remove media
- [ ] GET /api/collections - List collections (public)
- [ ] GET /api/collections/:id - Get collection details
- [ ] Enforce Partner tier requirement for pool creation
- [ ] Show upgrade prompt for free/contributor tiers trying to create pools

#### 4.3 Pool Licensing
- [ ] License from pool (not individual media)
- [ ] Pool pricing structure
- [ ] Revenue distribution within pool
- [ ] Pool member earnings

#### 4.4 Media Ownership Model
- [ ] Individual ownership (current)
- [ ] Pooled ownership
- [ ] Transfer between models
- [ ] Ownership display

### Deliverables
- ✅ Collection/Pool model
- ✅ Pool creation and management
- ✅ Pool licensing system
- ✅ Pool revenue distribution

### Dependencies
- Phase 2 (Licensing system)
- Phase 3 (Revenue system)

---

## Phase 5: Community Governance (Week 6-7)

### Goal
Implement community governance features

### Tasks

#### 5.1 Proposal Model
- [ ] Create Proposal schema
- [ ] Define proposal types (feature, policy, funding)
- [ ] Proposal status workflow
- [ ] Link proposals to proposers

#### 5.2 Voting System
- [ ] Create Vote model
- [ ] Calculate voting power (based on membership tier)
- [ ] Voting deadline management
- [ ] Vote counting and results

#### 5.3 Community Fund
- [ ] Create CommunityFund model
- [ ] Track fund balance
- [ ] Fund allocation to proposals
- [ ] Fund revenue sources (platform fees)

#### 5.4 Governance Endpoints
- [ ] POST /api/proposals - Create proposal
- [ ] GET /api/proposals - List proposals
- [ ] GET /api/proposals/:id - Get proposal details
- [ ] POST /api/proposals/:id/vote - Cast vote
- [ ] GET /api/proposals/:id/results - Get voting results
- [ ] GET /api/community/fund - Get fund status
- [ ] POST /api/community/fund/allocate - Allocate fund (admin)

#### 5.5 Forum/Discussions (Optional)
- [ ] Discussion threads
- [ ] Comments on proposals
- [ ] Community engagement

### Deliverables
- ✅ Proposal system
- ✅ Voting mechanism
- ✅ Community fund
- ✅ Governance endpoints

### Dependencies
- Phase 1 (Business model with voting power)
- Community engagement features

---

## Phase 6: Advanced Features (Week 7-8)

### Goal
Polish and enhance the platform

### Tasks

#### 6.1 Usage Tracking
- [ ] Track license usage
- [ ] Usage reports
- [ ] Usage analytics
- [ ] Compliance monitoring

#### 6.2 Enhanced Media Features
- [ ] Watermarked previews
- [ ] Download tracking
- [ ] View analytics
- [ ] Media recommendations

#### 6.3 Notifications
- [ ] Email notifications (license requests, approvals, payments)
- [ ] In-app notifications
- [ ] Notification preferences

#### 6.4 Analytics & Reporting
- [ ] Business dashboard
- [ ] Revenue analytics
- [ ] Licensing trends
- [ ] Platform statistics

#### 6.5 API Documentation
- [ ] Swagger/OpenAPI documentation
- [ ] Postman collection
- [ ] API versioning

### Deliverables
- ✅ Usage tracking
- ✅ Enhanced analytics
- ✅ Notification system
- ✅ Complete API documentation

### Dependencies
- All previous phases
- Analytics tools

---

## 🔄 Migration Strategy

### Step 1: Data Migration
1. Migrate existing Users to Businesses
2. Update Media ownerId references
3. Set default membership tier (free)
4. Initialize revenue balances
5. Initialize resource limits (uploadCount: 0, downloadCount: 0, activeLicenseCount: 0)
6. Set limit reset timestamps (lastUploadReset, lastDownloadReset)

### Step 2: Feature Rollout
1. Deploy Phase 1 (Business model with limits)
2. Test with existing data
3. Enforce upload limits (25-50 for free tier)
4. Deploy Phase 2 (Licensing with limits)
5. Enable licensing for existing media
6. Enforce download limits (50/month for free tier)
7. Enforce active license limits (3 for free tier)
8. Continue with subsequent phases

### Step 3: Backward Compatibility
- Keep existing endpoints working
- Add new endpoints alongside
- Gradual migration path
- Deprecation timeline
- Show upgrade prompts when limits reached

### Step 4: Upgrade Path Communication
- Display limit usage prominently ("X/25 uploads used")
- Show upgrade prompts when limits reached
- Emphasize "Unlimited uploads" for Contributor tier
- Clear value proposition for each tier

---

## 📊 Success Metrics

### Phase 1
- ✅ All users migrated to businesses
- ✅ Membership tiers functional (Free, Contributor, Partner, Equity Partner)
- ✅ Business profiles complete
- ✅ Resource limits tracked (uploadCount, downloadCount, activeLicenseCount)
- ✅ Limit enforcement middleware functional
- ✅ Subscription management working
- ✅ Upgrade prompts displayed when limits reached

### Phase 2
- ✅ Licenses can be created
- ✅ License workflow functional
- ✅ Media can be licensed
- ✅ Download limits enforced (50/month for free tier)
- ✅ Active license limits enforced (3 for free tier)
- ✅ Monthly limit reset working
- ✅ Limit usage displayed prominently

### Phase 3
- ✅ Payments processed
- ✅ Revenue distributed correctly (80/20, 85/15, 90/10, 95/5)
- ✅ Transactions tracked
- ✅ Platform commission calculated correctly

### Phase 4
- ✅ Collections created (Partner tier only)
- ✅ Pool licensing works
- ✅ Pool revenue shared
- ✅ Tier enforcement for pool creation

### Phase 5
- ✅ Proposals created
- ✅ Voting functional
- ✅ Community fund operational

### Phase 6
- ✅ Usage tracked
- ✅ Analytics available
- ✅ Platform production-ready

### Key Conversion Metrics
- ✅ Free tier upload limit hit rate (target: 20-30% conversion)
- ✅ Free tier download limit hit rate
- ✅ Free tier active license limit hit rate
- ✅ Free → Contributor conversion rate (target: 20-30%)
- ✅ Contributor → Partner conversion rate
- ✅ Subscription retention rate

---

## 🚨 Risks & Mitigation

### Risk 1: Payment Processing Complexity
- **Mitigation:** Start with simple payment provider (Stripe)
- **Fallback:** Manual payment processing initially

### Risk 2: Revenue Split Calculation
- **Mitigation:** Thorough testing of split logic
- **Fallback:** Manual review before distribution

### Risk 3: Governance Complexity
- **Mitigation:** Start simple, iterate
- **Fallback:** Admin override capability

### Risk 4: Data Migration
- **Mitigation:** Comprehensive migration scripts
- **Fallback:** Rollback procedures

---

## ✅ Next Steps

1. **Review and approve this plan**
2. **Start Phase 1: Foundation & Business Model**
3. **Set up development environment**
4. **Create detailed task breakdown for Phase 1**
5. **Set up payment provider (Stripe/PayPal) for subscriptions**

---

## 📝 Key Changes from Original Plan (Refined Model)

### Refined "Freemium with Fair Use" Model

**Key Features:**
1. **True Free Tier** - No barriers, no transaction requirements
   - 25-50 uploads max
   - 50 downloads/month
   - 3 active licenses at once
   - 80/20 revenue split
   - Still generates revenue when they license from others

2. **Unlimited Uploads = Key Unlock** - Contributor tier ($15/month)
   - Natural upgrade path
   - Clear value proposition
   - High conversion potential

3. **Smart Resource Limits** - Prevent abuse, encourage upgrades
   - Upload limits (25-50 for free)
   - Download limits (50/month for free)
   - Active license limits (3 for free)
   - Monthly reset system

4. **All 4 Tiers** - Free, Contributor, Partner, Equity Partner
   - Revenue splits: 80/20, 85/15, 90/10, 95/5
   - Clear upgrade path at each tier
   - Partner tier required for pool creation

5. **Limit Enforcement Throughout**
   - Phase 1: Upload limits
   - Phase 2: Download limits, active license limits
   - Phase 4: Pool creation (Partner tier only)
   - Upgrade prompts when limits reached

**Implementation Priority:**
- Phase 1: Resource limits are critical (foundation for everything)
- Phase 2: Download/active license limits are critical (core licensing)
- Phase 3: Revenue splits must reflect all 4 tiers
- Phase 4: Pool creation must enforce Partner tier requirement

---

**Estimated Total Duration:** 8 weeks
**Priority:** Phases 1-3 are critical for MVP
**Flexibility:** Phases 4-6 can be adjusted based on feedback
**Key Success Metric:** Free → Contributor conversion rate (target: 20-30%)

