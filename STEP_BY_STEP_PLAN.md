# Step-by-Step Implementation Plan: Refined "Freemium with Fair Use" Model

## Overview

This document provides detailed step-by-step plans for:
1. User model → Business model (add fields + resource limits)
2. Media model → Add licensing fields
3. Auth middleware → Add tier checks + limit enforcement
4. Routes → Add licensing routes + limit enforcement

**Business Model:** "Freemium with Fair Use"
- **Free Tier:** 25-50 uploads, 50 downloads/month, 3 active licenses, 80/20 split
- **Contributor Tier:** Unlimited uploads, 85/15 split, $15/month
- **Partner Tier:** 90/10 split, API access, pool creation, $50/month
- **Equity Partner Tier:** 95/5 split, ownership stake, $100/month or buy-in

**Key Unlock:** Unlimited uploads for Contributor tier ($15/month)

**Note:** This is a planning document only. No implementation should be done until explicitly requested.

---

## 1. User Model → Business Model (Add Fields + Resource Limits)

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
12. Add pre-save hook to increment Business uploadCount (Refined Model):
    - `mediaSchema.pre('save', async function(next) {
        if (this.isNew && this.ownerId) {
          const Business = require('./Business');
          const business = await Business.findById(this.ownerId);
          if (business) {
            // Check upload limit for free tier
            if (business.membershipTier === 'free') {
              if (business.uploadCount >= 25) { // or 50, configurable
                return next(new Error('Upload limit reached. Upgrade to Contributor for unlimited uploads.'));
              }
            }
            business.uploadCount += 1;
            await business.save();
          }
        }
        next();
      });`

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
   - Check upload limit before upload (Refined Model)
   - Show upgrade prompt if limit reached
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
2. Update upload route:
   - Add limit checking middleware (Refined Model)
   - Show upgrade prompt if limit reached

#### Step 2.5: Data Migration
1. Create migration script:
   - `scripts/add-licensing-fields-to-media.js`
2. Script should:
   - Set default values for all new fields
   - Set `isLicensable: false` for existing media
   - Set `ownershipModel: 'individual'` for existing media
   - Initialize arrays to empty
   - Set default pricing structure
   - Update ownerId references from User to Business

#### Step 2.6: Testing
1. Test schema changes:
   - Create media with licensing fields
   - Update licensing fields
   - Test validation
   - Test upload limit enforcement (Refined Model)
2. Test new endpoints:
   - Update licensing info
   - Set pricing
   - Enable/disable licensing
   - Test upload limit checking
3. Test queries:
   - Query licensable media
   - Filter by license types
   - Search by tags

---

## 3. Auth Middleware → Add Tier Checks + Limit Enforcement

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
  requirePartnerTier() - Require Partner tier or higher (for API access, pool creation)
  requireContributorTier() - Require Contributor tier or higher (for analytics, priority support)
  requireVerifiedBusiness() - Check business verification
  requireActiveSubscription() - Check subscription status
  checkUploadLimit() - Check upload limit (Refined Model)
  checkDownloadLimit() - Check download limit (Refined Model)
  checkActiveLicenseLimit() - Check active license limit (Refined Model)
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
       if (!req.business) {
         return res.status(401).json({ error: 'Authentication required' });
       }
       // Get business from req.business
       // Check if business.membershipTier is in allowedTiers
       if (!allowedTiers.includes(req.business.membershipTier)) {
         return res.status(403).json({ 
           error: 'Insufficient membership tier',
           requiredTier: allowedTiers,
           currentTier: req.business.membershipTier,
           upgradeUrl: '/api/subscriptions/upgrade'
         });
       }
       // If yes, continue
       next();
     }
   }
   ```
3. Add `requirePartnerTier` middleware (Refined Model):
   ```javascript
   const requirePartnerTier = requireMembershipTier(['partner', 'equityPartner']);
   ```
4. Add `requireContributorTier` middleware (Refined Model):
   ```javascript
   const requireContributorTier = requireMembershipTier(['contributor', 'partner', 'equityPartner']);
   ```
5. Add `requireVerifiedBusiness` middleware:
   ```javascript
   const requireVerifiedBusiness = async (req, res, next) => {
     if (!req.business) {
       return res.status(401).json({ error: 'Authentication required' });
     }
     if (!req.business.isVerified) {
       return res.status(403).json({ error: 'Business verification required' });
     }
     next();
   }
   ```
6. Add `requireActiveSubscription` middleware:
   ```javascript
   const requireActiveSubscription = async (req, res, next) => {
     if (!req.business) {
       return res.status(401).json({ error: 'Authentication required' });
     }
     if (req.business.membershipTier === 'free') {
       return next(); // Free tier doesn't need subscription
     }
     if (req.business.subscriptionStatus !== 'active') {
       return res.status(403).json({ error: 'Active subscription required' });
     }
     if (req.business.subscriptionExpiry && new Date() > req.business.subscriptionExpiry) {
       return res.status(403).json({ error: 'Subscription expired' });
     }
     next();
   }
   ```

#### Step 3.2: Add Limit Enforcement Middleware (Refined Model)
1. Add `checkUploadLimit` middleware:
   ```javascript
   const checkUploadLimit = async (req, res, next) => {
     if (!req.business) {
       return res.status(401).json({ error: 'Authentication required' });
     }
     const canUpload = await req.business.canUpload();
     if (!canUpload) {
       return res.status(403).json({
         error: 'Upload limit reached',
         currentUploads: req.business.uploadCount,
         uploadLimit: 25, // or 50, from tier config
         upgradeUrl: '/api/subscriptions/upgrade',
         message: 'Upgrade to Contributor for unlimited uploads'
       });
     }
     next();
   }
   ```
2. Add `checkDownloadLimit` middleware:
   ```javascript
   const checkDownloadLimit = async (req, res, next) => {
     if (!req.business) {
       return res.status(401).json({ error: 'Authentication required' });
     }
     // Reset download count if needed (monthly)
     await req.business.canDownload(); // This resets if needed
     const canDownload = await req.business.canDownload();
     if (!canDownload) {
       return res.status(403).json({
         error: 'Download limit reached',
         currentDownloads: req.business.downloadCount,
         downloadLimit: 50,
         resetDate: req.business.lastDownloadReset,
         upgradeUrl: '/api/subscriptions/upgrade',
         message: 'Upgrade to Contributor for unlimited downloads'
       });
     }
     next();
   }
   ```
3. Add `checkActiveLicenseLimit` middleware:
   ```javascript
   const checkActiveLicenseLimit = async (req, res, next) => {
     if (!req.business) {
       return res.status(401).json({ error: 'Authentication required' });
     }
     const canCreate = await req.business.canCreateActiveLicense();
     if (!canCreate) {
       return res.status(403).json({
         error: 'Active license limit reached',
         currentActiveLicenses: req.business.activeLicenseCount,
         activeLicenseLimit: 3,
         upgradeUrl: '/api/subscriptions/upgrade',
         message: 'Upgrade to Contributor for unlimited active licenses'
       });
     }
     next();
   }
   ```

#### Step 3.3: Add Helper Functions
1. Add `calculateVotingPower` function:
   ```javascript
   const calculateVotingPower = (business) => {
     const tierVotes = {
       free: 1,
       contributor: 2,
       partner: 3,
       equityPartner: 5
     };
     return tierVotes[business.membershipTier] || 0;
   }
   ```
2. Add `getRevenueSplit` function (Refined Model):
   ```javascript
   const getRevenueSplit = (business) => {
     const splits = {
       free: { creator: 80, platform: 20 },
       contributor: { creator: 85, platform: 15 },
       partner: { creator: 90, platform: 10 },
       equityPartner: { creator: 95, platform: 5 }
     };
     return splits[business.membershipTier] || splits.free;
   }
   ```
3. Add `checkTierAccess` function:
   ```javascript
   const checkTierAccess = (business, requiredTier) => {
     const tierHierarchy = {
       free: 0,
       contributor: 1,
       partner: 2,
       equityPartner: 3
     };
     return tierHierarchy[business.membershipTier] >= tierHierarchy[requiredTier];
   }
   ```

#### Step 3.4: Update Existing Middleware
1. Update `authenticate` middleware:
   - After verifying token, populate Business
   - Attach Business to `req.business` (in addition to `req.user`)
   - Include membership tier in response
   - Include resource limits in response (Refined Model)
2. Add tier information to request:
   - `req.business.membershipTier`
   - `req.business.subscriptionStatus`
   - `req.business.votingPower`
   - `req.business.uploadCount` (Refined Model)
   - `req.business.downloadCount` (Refined Model)
   - `req.business.activeLicenseCount` (Refined Model)

#### Step 3.5: Create Tier-Specific Middleware
1. Create `requireFreeTier`:
   - `requireMembershipTier(['free', 'contributor', 'partner', 'equityPartner'])`
2. Create `requireContributorTier`:
   - `requireMembershipTier(['contributor', 'partner', 'equityPartner'])`
3. Create `requirePartnerTier`:
   - `requireMembershipTier(['partner', 'equityPartner'])`
4. Create `requireEquityPartnerTier`:
   - `requireMembershipTier(['equityPartner'])`

#### Step 3.6: Update Error Messages (Refined Model)
1. Add tier-specific error messages:
   - "This feature requires Contributor membership ($15/month)"
   - "This feature requires Partner membership ($50/month)"
   - "Your subscription has expired"
   - "Please verify your business account"
   - "Upload limit reached. Upgrade to Contributor for unlimited uploads."
   - "Download limit reached (50/month). Upgrade to Contributor for unlimited downloads."
   - "Active license limit reached (3 active). Upgrade to Contributor for unlimited active licenses."

#### Step 3.7: Testing
1. Test tier checks:
   - Free tier accessing contributor features
   - Contributor accessing partner features
   - Expired subscription access
2. Test limit enforcement (Refined Model):
   - Upload limit enforcement
   - Download limit enforcement
   - Active license limit enforcement
   - Monthly download reset
3. Test middleware combinations:
   - `authenticate` + `requireContributorTier`
   - `authenticate` + `requireActiveSubscription`
   - `authenticate` + `checkUploadLimit`
   - `authenticate` + `checkDownloadLimit`
   - `authenticate` + `checkActiveLicenseLimit`
4. Test error responses:
   - Verify correct error messages
   - Verify correct status codes (403)
   - Verify upgrade prompts

---

## 4. Routes → Add Licensing Routes + Limit Enforcement

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
  /api/business/* - Business management (with limits)
  /api/media/* - Media CRUD + Licensing (with upload limits)
  /api/licenses/* - License management (with download/active license limits)
  /api/subscriptions/* - Subscription management (NEW)
  /api/collections/* - Collections/Pools (Partner tier only)
  /api/proposals/* - Governance
  /api/transactions/* - Financial
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
   - Limit enforcement middleware (Refined Model)
3. Define routes structure:
   - License creation (with download limit check)
   - License management
   - License approval (with active license limit check)
   - License listing

#### Step 4.2: License Creation Routes (Refined Model)
1. `POST /api/licenses` - Create license request
   - Middleware: `authenticate`, `requireVerifiedBusiness`, `checkDownloadLimit`
   - Body: `{ mediaId, licenseType, terms, price }`
   - Controller: `createLicenseRequest`
   - Increment download count on success
2. `GET /api/licenses/pending` - Get pending licenses (as licensor)
   - Middleware: `authenticate`
   - Controller: `getPendingLicenses`
3. `GET /api/licenses/requests` - Get license requests (as licensee)
   - Middleware: `authenticate`
   - Controller: `getLicenseRequests`

#### Step 4.3: License Management Routes (Refined Model)
1. `GET /api/licenses` - List all licenses
   - Middleware: `authenticate`
   - Query params: `status`, `type`, `asLicensor`, `asLicensee`
   - Controller: `listLicenses`
2. `GET /api/licenses/:id` - Get license details
   - Middleware: `authenticate`
   - Controller: `getLicenseById`
3. `PUT /api/licenses/:id/approve` - Approve license
   - Middleware: `authenticate`, `requireVerifiedBusiness`, `checkActiveLicenseLimit`
   - Controller: `approveLicense`
   - Increment active license count on success
4. `PUT /api/licenses/:id/reject` - Reject license
   - Middleware: `authenticate`, `requireVerifiedBusiness`
   - Body: `{ reason }`
   - Controller: `rejectLicense`
5. `PUT /api/licenses/:id/cancel` - Cancel license
   - Middleware: `authenticate`
   - Controller: `cancelLicense`
   - Decrement active license count on success
6. `GET /api/media/:id/download` - Download licensed media
   - Middleware: `authenticate`, `checkDownloadLimit`
   - Controller: `downloadLicensedMedia`
   - Increment download count on success

#### Step 4.4: License Status Routes
1. `GET /api/licenses/active` - Get active licenses
   - Middleware: `authenticate`
   - Controller: `getActiveLicenses`
2. `GET /api/licenses/expired` - Get expired licenses
   - Middleware: `authenticate`
   - Controller: `getExpiredLicenses`
   - Decrement active license count on expiry
3. `PUT /api/licenses/:id/renew` - Renew license
   - Middleware: `authenticate`, `checkActiveLicenseLimit`
   - Body: `{ duration }`
   - Controller: `renewLicense`

#### Step 4.5: Media Licensing Routes (Refined Model)
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
4. `POST /api/media` - Upload media (Refined Model)
   - Middleware: `authenticate`, `checkUploadLimit`
   - Controller: `uploadFile`
   - Show upgrade prompt if limit reached

#### Step 4.6: Business Licensing Routes (Refined Model)
1. `GET /api/business/licenses` - Get business licenses
   - Middleware: `authenticate`
   - Query params: `asLicensor`, `asLicensee`, `status`
   - Controller: `getBusinessLicenses`
2. `GET /api/business/licenses/stats` - Get license statistics
   - Middleware: `authenticate`
   - Controller: `getLicenseStats`
3. `GET /api/business/limits` - Get current limit usage (NEW - Refined Model)
   - Middleware: `authenticate`
   - Controller: `getBusinessLimits`
   - Response: `{ uploadCount, uploadLimit, downloadCount, downloadLimit, activeLicenseCount, activeLicenseLimit, tier }`
4. `GET /api/business/tier` - Get tier information and upgrade options (NEW - Refined Model)
   - Middleware: `authenticate`
   - Controller: `getTierInfo`
   - Response: `{ currentTier, limits, features, upgradeOptions }`

#### Step 4.7: Subscription Management Routes (NEW - Refined Model)
1. `POST /api/subscriptions/upgrade` - Upgrade tier
   - Middleware: `authenticate`
   - Body: `{ tier: 'contributor' | 'partner' | 'equityPartner' }`
   - Controller: `upgradeSubscription`
   - Process payment
   - Update membership tier
   - Reset limits (unlimited for paid tiers)
2. `POST /api/subscriptions/downgrade` - Downgrade tier
   - Middleware: `authenticate`
   - Body: `{ tier: 'free' }`
   - Controller: `downgradeSubscription`
   - Cancel subscription
   - Update membership tier
   - Apply limits (25-50 uploads, 50 downloads/month, 3 active licenses)
3. `GET /api/subscriptions/status` - Get subscription status
   - Middleware: `authenticate`
   - Controller: `getSubscriptionStatus`
4. `POST /api/subscriptions/cancel` - Cancel subscription
   - Middleware: `authenticate`
   - Controller: `cancelSubscription`
   - Downgrade to free tier
   - Apply limits

#### Step 4.8: Collections/Pools Routes (Partner Tier Only - Refined Model)
1. `POST /api/collections` - Create collection
   - Middleware: `authenticate`, `requirePartnerTier`
   - Controller: `createCollection`
   - Show upgrade prompt if not Partner tier
2. `PUT /api/collections/:id` - Update collection
   - Middleware: `authenticate`, `requirePartnerTier`
   - Controller: `updateCollection`
3. `GET /api/collections` - List collections
   - Middleware: `authenticate` (optional)
   - Controller: `listCollections`
4. `GET /api/collections/:id` - Get collection details
   - Middleware: `authenticate` (optional)
   - Controller: `getCollectionDetails`

#### Step 4.9: Update App Routes
1. Open `src/app.js`
2. Import license routes:
   - `const licenseRoutes = require('./routes/licenseRoutes')`
3. Import subscription routes (Refined Model):
   - `const subscriptionRoutes = require('./routes/subscriptionRoutes')`
4. Add license routes:
   - `app.use('/api/licenses', authenticate, licenseRoutes)`
5. Add subscription routes (Refined Model):
   - `app.use('/api/subscriptions', authenticate, subscriptionRoutes)`
6. Update media routes:
   - Add upload limit middleware (Refined Model)
   - Add new licensing endpoints

#### Step 4.10: Route Protection (Refined Model)
1. Public routes (no auth):
   - `GET /api/media/licensable` - Browse licensable media
   - `GET /api/media/:id/licensing-info` - View licensing info
2. Authenticated routes:
   - All license creation and management
   - Business license listings
   - Limit information
3. Tier-protected routes:
   - `POST /api/licenses` - Require verified business + download limit check
   - `PUT /api/licenses/:id/approve` - Require verified business + active license limit check
   - `POST /api/collections` - Require Partner tier
   - `POST /api/media` - Require upload limit check
   - Advanced features - Require contributor/partner tier

#### Step 4.11: Validation (Refined Model)
1. Add validation for license creation:
   - Media ID exists and is licensable
   - License type is valid
   - Terms are valid
   - Price is valid
   - Download limit not reached
2. Add validation for license approval:
   - User owns the media
   - License is in pending status
   - Active license limit not reached
3. Add validation for media upload:
   - Upload limit not reached
   - File type is valid
   - File size is valid
4. Add validation for subscription upgrade:
   - Valid tier selected
   - Payment method valid
   - Payment processed

#### Step 4.12: Testing (Refined Model)
1. Test route creation:
   - Create license request (with download limit check)
   - Approve license (with active license limit check)
   - Reject license
   - Upload media (with upload limit check)
2. Test route protection:
   - Unauthenticated access
   - Wrong tier access
   - Unverified business access
   - Limit reached access
3. Test limit enforcement:
   - Upload limit enforcement
   - Download limit enforcement
   - Active license limit enforcement
   - Monthly download reset
4. Test subscription routes:
   - Upgrade tier
   - Downgrade tier
   - Get subscription status
   - Cancel subscription
5. Test route queries:
   - List licenses with filters
   - Get license details
   - Get business licenses
   - Get limit usage

---

## Implementation Order

### Recommended Sequence

1. **Phase 1: User → Business Model + Resource Limits**
   - Do this first (foundation for everything else)
   - Create Business model with resource limits
   - Create tier configuration
   - Migrate existing data
   - Test thoroughly

2. **Phase 2: Media Licensing Fields + Upload Limits**
   - Add fields to Media model
   - Add upload limit enforcement
   - Update controllers
   - Add new routes

3. **Phase 3: Auth Middleware Tier Checks + Limit Enforcement**
   - Add tier checks
   - Add limit enforcement middleware
   - Update existing routes
   - Test access control

4. **Phase 4: Licensing Routes + Download/Active License Limits**
   - Create License model first (separate task)
   - Then create routes
   - Add download limit enforcement
   - Add active license limit enforcement
   - Integrate with existing routes

### Dependencies

- **Business Model** must be done before:
  - Media model updates (needs Business reference + upload limits)
  - Auth middleware (needs Business model + limit checking)
  - Licensing routes (needs Business model + limit enforcement)

- **Media Licensing Fields** must be done before:
  - Licensing routes (needs licensing fields)

- **Auth Middleware** can be done in parallel with:
  - Media model updates
  - But needed before licensing routes

- **Licensing Routes** depends on:
  - Business model (with resource limits)
  - Media licensing fields
  - Auth middleware (with limit enforcement)
  - License model (separate task)

---

## Testing Checklist

### Business Model (Refined Model)
- [ ] Migration script runs successfully
- [ ] All users migrated to businesses
- [ ] Resource limits initialized (uploadCount, downloadCount, activeLicenseCount)
- [ ] Business profile can be updated
- [ ] Membership tier can be changed
- [ ] Revenue balance updates correctly
- [ ] Voting power calculates correctly
- [ ] Upload limit checking works
- [ ] Download limit checking works (with monthly reset)
- [ ] Active license limit checking works

### Media Licensing Fields (Refined Model)
- [ ] Licensing fields can be added
- [ ] Pricing can be set
- [ ] License types can be configured
- [ ] Usage restrictions can be set
- [ ] Media can be made licensable
- [ ] Media can be added to pools
- [ ] Upload limit enforced on media creation
- [ ] Business uploadCount increments on media creation

### Auth Middleware (Refined Model)
- [ ] Tier checks work correctly
- [ ] Free tier blocked from contributor features
- [ ] Contributor tier blocked from partner features
- [ ] Expired subscriptions blocked
- [ ] Unverified businesses blocked
- [ ] Upload limit middleware works
- [ ] Download limit middleware works (with monthly reset)
- [ ] Active license limit middleware works
- [ ] Error messages are clear
- [ ] Upgrade prompts displayed

### Licensing Routes (Refined Model)
- [ ] License can be created (with download limit check)
- [ ] License can be approved (with active license limit check)
- [ ] License can be rejected
- [ ] Licenses can be listed
- [ ] License details can be retrieved
- [ ] Route protection works
- [ ] Limit enforcement works
- [ ] Download count increments on license creation
- [ ] Active license count increments on approval
- [ ] Monthly download reset works
- [ ] Subscription routes work
- [ ] Limit information endpoint works

---

## Notes

- All changes should be backward compatible initially
- Migration scripts should be tested on copy of production data
- Rollback procedures should be documented
- API versioning may be needed for breaking changes
- Consider feature flags for gradual rollout
- **Resource limits are critical** - must be enforced correctly
- **Monthly download reset** must be implemented correctly
- **Upgrade prompts** should be clear and actionable
- **Tier configuration** should be easily configurable

---

**This is a planning document. Implementation should only proceed when explicitly requested.**
