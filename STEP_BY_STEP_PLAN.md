# Step-by-Step Implementation Plan

## Overview

This document provides detailed step-by-step plans for:
1. User model → Business model (add fields)
2. Media model → Add licensing fields
3. Auth middleware → Add tier checks
4. Routes → Add licensing routes

**Note:** This is a planning document only. No implementation should be done until explicitly requested.

---

## 1. User Model → Business Model (Add Fields)

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
  
  // Membership
  membershipTier: 'free' | 'contributor' | 'partner'
  subscriptionStatus: 'active' | 'inactive' | 'cancelled'
  subscriptionExpiry, subscriptionStart
  
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
4. Add membership tier fields:
   - `membershipTier: { type: String, enum: ['free', 'contributor', 'partner'], default: 'free' }`
   - `subscriptionStatus: { type: String, enum: ['active', 'inactive', 'cancelled'], default: 'active' }`
   - `subscriptionExpiry: Date`
   - `subscriptionStart: Date`
5. Add financial fields:
   - `revenueBalance: { type: Number, default: 0 }`
   - `totalEarnings: { type: Number, default: 0 }`
   - `totalSpent: { type: Number, default: 0 }`
   - `transactionHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' }]`
6. Add governance fields:
   - `votingPower: { type: Number, default: 0 }` (calculated based on tier)
   - `governanceParticipation: { type: Number, default: 0 }` (count of votes/proposals)
   - `proposalsCreated: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' }]`
   - `votesCast: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vote' }]`
7. Add licensing fields:
   - `mediaPortfolio: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Media' }]`
   - `licensesAsLicensor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'License' }]`
   - `licensesAsLicensee: [{ type: mongoose.Schema.Types.ObjectId, ref: 'License' }]`
8. Add collection fields:
   - `collectionsOwned: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }]`
   - `collectionsMemberOf: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }]`
9. Add indexes for performance:
   - Index on `membershipTier`
   - Index on `companyName` (for search)
   - Index on `industry`
10. Add virtual for calculating voting power:
    - `businessSchema.virtual('calculatedVotingPower').get(function() { ... })`
11. Add method to calculate revenue split percentage:
    - `businessSchema.methods.getRevenueSplit = function() { ... }`

#### Step 1.2: Create Migration Script
1. Create file: `scripts/migrate-user-to-business.js`
2. Script should:
   - Read all existing Users
   - Create Business documents with:
     - All User fields copied
     - Default business fields (companyName = name, membershipTier = 'free')
     - Initialize financial fields to 0
     - Initialize arrays to empty
   - Save new Business documents
   - Log migration progress
   - Handle errors gracefully
3. Create rollback script (optional):
   - `scripts/rollback-business-to-user.js`

#### Step 1.3: Update References
1. Update Media model:
   - Change `ownerId` ref from 'User' to 'Business'
2. Update all controllers:
   - Replace `User` imports with `Business`
   - Update queries to use Business model
3. Update auth controller:
   - Change registration to create Business instead of User
   - Update login to use Business model
4. Update seed script:
   - Create Businesses instead of Users
   - Add business profile data

#### Step 1.4: Update Business Logic
1. Add membership tier calculation:
   - Free: default
   - Contributor: $10-25/month subscription
   - Partner: $50+/month or equity buy-in
2. Add voting power calculation:
   - Free: 1 vote
   - Contributor: 2 votes
   - Partner: 3 votes
3. Add revenue split calculation:
   - Free: 80/20 (creator/platform)
   - Contributor: 85/15
   - Partner: 90/10

#### Step 1.5: Testing
1. Test migration script:
   - Run on test database
   - Verify all users migrated
   - Verify data integrity
2. Test Business model:
   - Create new business
   - Update business profile
   - Test membership tier changes
3. Test references:
   - Verify Media → Business relationship
   - Test queries with populated Business

---

## 2. Media Model → Add Licensing Fields

### Current State
```javascript
Media {
  filename, originalName, mimetype, category
  size, url, cloudinaryId
  thumbnailUrl, metadata
  ownerId (reference to User)
}
```

### Target State
```javascript
Media {
  // Basic (keep existing)
  filename, originalName, mimetype, category
  size, url, cloudinaryId, thumbnailUrl, metadata
  ownerId (reference to Business)
  
  // Licensing
  title, description, tags, category
  ownershipModel: 'individual' | 'pooled'
  isLicensable: Boolean
  licenseTypes: ['commercial', 'editorial', 'exclusive']
  pricing: {
    basePrice: Number
    currency: String
    licenseType: String
  }
  usageRestrictions: {
    geographic: [String]
    duration: String
    modification: Boolean
  }
  copyrightInformation: String
  
  // Licensing Status
  licenseCount: Number
  activeLicenses: [License IDs]
  
  // Watermarking
  watermarkedPreviewUrl: String
  
  // Pool Membership
  poolId: ObjectId (if part of collection)
}
```

### Step-by-Step Plan

#### Step 2.1: Add Licensing Fields to Media Schema
1. Open `src/models/Media.js`
2. Add basic licensing fields:
   - `title: { type: String, required: false }`
   - `description: { type: String, required: false }`
   - `tags: [{ type: String }]`
   - `isLicensable: { type: Boolean, default: false }`
   - `ownershipModel: { type: String, enum: ['individual', 'pooled'], default: 'individual' }`
3. Add license types:
   - `licenseTypes: [{ type: String, enum: ['commercial', 'editorial', 'exclusive'] }]`
4. Add pricing structure:
   - `pricing: {`
     - `basePrice: { type: Number, default: 0 }`
     - `currency: { type: String, default: 'USD' }`
     - `licenseType: { type: String }`
   - `}`
5. Add usage restrictions:
   - `usageRestrictions: {`
     - `geographic: [{ type: String }]` (e.g., ['US', 'CA'])
     - `duration: { type: String }` (e.g., '1 year', 'perpetual')
     - `modification: { type: Boolean, default: false }`
   - `}`
6. Add copyright information:
   - `copyrightInformation: { type: String }`
7. Add licensing status:
   - `licenseCount: { type: Number, default: 0 }`
   - `activeLicenses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'License' }]`
8. Add watermarking:
   - `watermarkedPreviewUrl: { type: String }`
9. Add pool membership:
   - `poolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', required: false }`
10. Update ownerId reference:
    - Change from `ref: 'User'` to `ref: 'Business'`
11. Add indexes:
    - Index on `isLicensable`
    - Index on `ownershipModel`
    - Index on `poolId`
    - Text index on `title`, `description`, `tags`

#### Step 2.2: Add Media Methods
1. Add method to check if licensable:
   - `mediaSchema.methods.isLicensable = function() { ... }`
2. Add method to get pricing for license type:
   - `mediaSchema.methods.getPriceForLicenseType = function(licenseType) { ... }`
3. Add method to check usage restrictions:
   - `mediaSchema.methods.checkUsageRestrictions = function(usage) { ... }`
4. Add method to generate watermarked preview:
   - `mediaSchema.methods.generateWatermarkedPreview = async function() { ... }`

#### Step 2.3: Update Media Controller
1. Update `uploadFile` function:
   - Add default licensing fields on upload
   - Set `isLicensable: false` by default
   - Set `ownershipModel: 'individual'` by default
2. Add new functions:
   - `updateMediaLicensing` - Update licensing info
   - `setMediaPricing` - Set pricing
   - `setMediaLicenseTypes` - Set available license types
   - `setMediaUsageRestrictions` - Set usage restrictions
   - `makeMediaLicensable` - Enable licensing
   - `addMediaToPool` - Add to collection/pool
   - `removeMediaFromPool` - Remove from pool

#### Step 2.4: Update Media Routes
1. Add new routes:
   - `PUT /api/media/:id/licensing` - Update licensing info
   - `PUT /api/media/:id/pricing` - Update pricing
   - `PUT /api/media/:id/license-types` - Update license types
   - `PUT /api/media/:id/usage-restrictions` - Update usage restrictions
   - `PUT /api/media/:id/make-licensable` - Enable licensing
   - `PUT /api/media/:id/pool` - Add to pool
   - `DELETE /api/media/:id/pool` - Remove from pool
   - `GET /api/media/licensable` - List licensable media
   - `GET /api/media/:id/licensing-info` - Get licensing details

#### Step 2.5: Data Migration
1. Create migration script:
   - `scripts/add-licensing-fields-to-media.js`
2. Script should:
   - Set default values for all new fields
   - Set `isLicensable: false` for existing media
   - Set `ownershipModel: 'individual'` for existing media
   - Initialize arrays to empty
   - Set default pricing structure

#### Step 2.6: Testing
1. Test schema changes:
   - Create media with licensing fields
   - Update licensing fields
   - Test validation
2. Test new endpoints:
   - Update licensing info
   - Set pricing
   - Enable/disable licensing
3. Test queries:
   - Query licensable media
   - Filter by license types
   - Search by tags

---

## 3. Auth Middleware → Add Tier Checks

### Current State
```javascript
auth.js {
  authenticate() - Verifies JWT token
  optionalAuth() - Optional authentication
}
```

### Target State
```javascript
auth.js {
  authenticate() - Verifies JWT token
  optionalAuth() - Optional authentication
  requireMembershipTier() - Check membership tier
  requireVerifiedBusiness() - Check business verification
  requireActiveSubscription() - Check subscription status
  calculateVotingPower() - Calculate voting power
}
```

### Step-by-Step Plan

#### Step 3.1: Add Tier Check Middleware
1. Open `src/middlewares/auth.js`
2. Add `requireMembershipTier` middleware:
   ```javascript
   const requireMembershipTier = (allowedTiers) => {
     return async (req, res, next) => {
       // Check if user is authenticated
       // Get business from req.user
       // Check if business.membershipTier is in allowedTiers
       // If not, return 403 Forbidden
       // If yes, continue
     }
   }
   ```
3. Add `requireVerifiedBusiness` middleware:
   ```javascript
   const requireVerifiedBusiness = async (req, res, next) => {
     // Check if business is verified
     // If not, return 403 Forbidden
   }
   ```
4. Add `requireActiveSubscription` middleware:
   ```javascript
   const requireActiveSubscription = async (req, res, next) => {
     // Check if subscription is active
     // Check if subscription hasn't expired
     // If not active, return 403 Forbidden
   }
   ```

#### Step 3.2: Add Helper Functions
1. Add `calculateVotingPower` function:
   ```javascript
   const calculateVotingPower = (business) => {
     // Free: 1 vote
     // Contributor: 2 votes
     // Partner: 3 votes
     // Return calculated voting power
   }
   ```
2. Add `getRevenueSplit` function:
   ```javascript
   const getRevenueSplit = (business) => {
     // Free: { creator: 80, platform: 20 }
     // Contributor: { creator: 85, platform: 15 }
     // Partner: { creator: 90, platform: 10 }
     // Return split percentages
   }
   ```
3. Add `checkTierAccess` function:
   ```javascript
   const checkTierAccess = (business, requiredTier) => {
     // Check if business tier meets requirement
     // Return true/false
   }
   ```

#### Step 3.3: Update Existing Middleware
1. Update `authenticate` middleware:
   - After verifying token, populate Business
   - Attach Business to `req.business` (in addition to `req.user`)
   - Include membership tier in response
2. Add tier information to request:
   - `req.business.membershipTier`
   - `req.business.subscriptionStatus`
   - `req.business.votingPower`

#### Step 3.4: Create Tier-Specific Middleware
1. Create `requireFreeTier`:
   - `requireMembershipTier(['free', 'contributor', 'partner'])`
2. Create `requireContributorTier`:
   - `requireMembershipTier(['contributor', 'partner'])`
3. Create `requirePartnerTier`:
   - `requireMembershipTier(['partner'])`

#### Step 3.5: Update Error Messages
1. Add tier-specific error messages:
   - "This feature requires Contributor membership"
   - "This feature requires Partner membership"
   - "Your subscription has expired"
   - "Please verify your business account"

#### Step 3.6: Testing
1. Test tier checks:
   - Free tier accessing contributor features
   - Contributor accessing partner features
   - Expired subscription access
2. Test middleware combinations:
   - `authenticate` + `requireContributorTier`
   - `authenticate` + `requireActiveSubscription`
3. Test error responses:
   - Verify correct error messages
   - Verify correct status codes (403)

---

## 4. Routes → Add Licensing Routes

### Current State
```javascript
Routes {
  /api/auth/* - Authentication
  /api/media/* - Media CRUD
}
```

### Target State
```javascript
Routes {
  /api/auth/* - Authentication
  /api/business/* - Business management
  /api/media/* - Media CRUD + Licensing
  /api/licenses/* - License management (NEW)
  /api/collections/* - Collections/Pools (NEW)
  /api/proposals/* - Governance (NEW)
  /api/transactions/* - Financial (NEW)
}
```

### Step-by-Step Plan

#### Step 4.1: Create License Routes File
1. Create `src/routes/licenseRoutes.js`
2. Import dependencies:
   - Express Router
   - License controller
   - Auth middleware
   - Tier check middleware
3. Define routes structure:
   - License creation
   - License management
   - License approval
   - License listing

#### Step 4.2: License Creation Routes
1. `POST /api/licenses` - Create license request
   - Middleware: `authenticate`, `requireVerifiedBusiness`
   - Body: `{ mediaId, licenseType, terms, price }`
   - Controller: `createLicenseRequest`
2. `GET /api/licenses/pending` - Get pending licenses (as licensor)
   - Middleware: `authenticate`
   - Controller: `getPendingLicenses`
3. `GET /api/licenses/requests` - Get license requests (as licensee)
   - Middleware: `authenticate`
   - Controller: `getLicenseRequests`

#### Step 4.3: License Management Routes
1. `GET /api/licenses` - List all licenses
   - Middleware: `authenticate`
   - Query params: `status`, `type`, `asLicensor`, `asLicensee`
   - Controller: `listLicenses`
2. `GET /api/licenses/:id` - Get license details
   - Middleware: `authenticate`
   - Controller: `getLicenseById`
3. `PUT /api/licenses/:id/approve` - Approve license
   - Middleware: `authenticate`, `requireVerifiedBusiness`
   - Controller: `approveLicense`
4. `PUT /api/licenses/:id/reject` - Reject license
   - Middleware: `authenticate`, `requireVerifiedBusiness`
   - Body: `{ reason }`
   - Controller: `rejectLicense`
5. `PUT /api/licenses/:id/cancel` - Cancel license
   - Middleware: `authenticate`
   - Controller: `cancelLicense`

#### Step 4.4: License Status Routes
1. `GET /api/licenses/active` - Get active licenses
   - Middleware: `authenticate`
   - Controller: `getActiveLicenses`
2. `GET /api/licenses/expired` - Get expired licenses
   - Middleware: `authenticate`
   - Controller: `getExpiredLicenses`
3. `PUT /api/licenses/:id/renew` - Renew license
   - Middleware: `authenticate`
   - Body: `{ duration }`
   - Controller: `renewLicense`

#### Step 4.5: Media Licensing Routes
1. `GET /api/media/:id/licenses` - Get licenses for media
   - Middleware: `authenticate`
   - Controller: `getMediaLicenses`
2. `GET /api/media/licensable` - List licensable media
   - Middleware: `authenticate` (optional)
   - Query params: `category`, `licenseType`, `priceRange`
   - Controller: `listLicensableMedia`
3. `GET /api/media/:id/licensing-info` - Get licensing details
   - Middleware: `authenticate` (optional)
   - Controller: `getMediaLicensingInfo`

#### Step 4.6: Business Licensing Routes
1. `GET /api/business/licenses` - Get business licenses
   - Middleware: `authenticate`
   - Query params: `asLicensor`, `asLicensee`, `status`
   - Controller: `getBusinessLicenses`
2. `GET /api/business/licenses/stats` - Get license statistics
   - Middleware: `authenticate`
   - Controller: `getLicenseStats`

#### Step 4.7: Update App Routes
1. Open `src/app.js`
2. Import license routes:
   - `const licenseRoutes = require('./routes/licenseRoutes')`
3. Add license routes:
   - `app.use('/api/licenses', authenticate, licenseRoutes)`
4. Update media routes:
   - Add new licensing endpoints to media routes
   - Or create separate licensing routes file

#### Step 4.8: Route Protection
1. Public routes (no auth):
   - `GET /api/media/licensable` - Browse licensable media
   - `GET /api/media/:id/licensing-info` - View licensing info
2. Authenticated routes:
   - All license creation and management
   - Business license listings
3. Tier-protected routes:
   - `POST /api/licenses` - Require verified business
   - `PUT /api/licenses/:id/approve` - Require verified business
   - Advanced features - Require contributor/partner tier

#### Step 4.9: Validation
1. Add validation for license creation:
   - Media ID exists and is licensable
   - License type is valid
   - Terms are valid
   - Price is valid
2. Add validation for license approval:
   - User owns the media
   - License is in pending status
3. Add validation for license queries:
   - User has permission to view license

#### Step 4.10: Testing
1. Test route creation:
   - Create license request
   - Approve license
   - Reject license
2. Test route protection:
   - Unauthenticated access
   - Wrong tier access
   - Unverified business access
3. Test route queries:
   - List licenses with filters
   - Get license details
   - Get business licenses

---

## Implementation Order

### Recommended Sequence

1. **Phase 1: User → Business Model**
   - Do this first (foundation for everything else)
   - Migrate existing data
   - Test thoroughly

2. **Phase 2: Media Licensing Fields**
   - Add fields to Media model
   - Update controllers
   - Add new routes

3. **Phase 3: Auth Middleware Tier Checks**
   - Add tier checks
   - Update existing routes
   - Test access control

4. **Phase 4: Licensing Routes**
   - Create License model first (separate task)
   - Then create routes
   - Integrate with existing routes

### Dependencies

- **Business Model** must be done before:
  - Media model updates (needs Business reference)
  - Auth middleware (needs Business model)
  - Licensing routes (needs Business model)

- **Media Licensing Fields** must be done before:
  - Licensing routes (needs licensing fields)

- **Auth Middleware** can be done in parallel with:
  - Media model updates
  - But needed before licensing routes

- **Licensing Routes** depends on:
  - Business model
  - Media licensing fields
  - Auth middleware
  - License model (separate task)

---

## Testing Checklist

### Business Model
- [ ] Migration script runs successfully
- [ ] All users migrated to businesses
- [ ] Business profile can be updated
- [ ] Membership tier can be changed
- [ ] Revenue balance updates correctly
- [ ] Voting power calculates correctly

### Media Licensing Fields
- [ ] Licensing fields can be added
- [ ] Pricing can be set
- [ ] License types can be configured
- [ ] Usage restrictions can be set
- [ ] Media can be made licensable
- [ ] Media can be added to pools

### Auth Middleware
- [ ] Tier checks work correctly
- [ ] Free tier blocked from contributor features
- [ ] Contributor tier blocked from partner features
- [ ] Expired subscriptions blocked
- [ ] Unverified businesses blocked
- [ ] Error messages are clear

### Licensing Routes
- [ ] License can be created
- [ ] License can be approved
- [ ] License can be rejected
- [ ] Licenses can be listed
- [ ] License details can be retrieved
- [ ] Route protection works
- [ ] Validation works

---

## Notes

- All changes should be backward compatible initially
- Migration scripts should be tested on copy of production data
- Rollback procedures should be documented
- API versioning may be needed for breaking changes
- Consider feature flags for gradual rollout

---

**This is a planning document. Implementation should only proceed when explicitly requested.**

