const express = require('express');
const router = express.Router();

// Import business controller functions
const {
  getBusinessLicenses,
  getLicenseStats,
  getBusinessLimits,
  getTierInfo,
  onboardStripeConnect,
  getStripeConnectStatus,
  requestPayout
} = require('../controllers/businessController');

// All routes require authentication (applied in app.js)

// ============================================
// Business License Routes
// ============================================

/**
 * GET /api/business/licenses
 * Get business licenses
 * Middleware: authenticate (app.js)
 * Query params: asLicensor, asLicensee, status
 */
router.get('/licenses', getBusinessLicenses);

/**
 * GET /api/business/licenses/stats
 * Get license statistics
 * Middleware: authenticate (app.js)
 */
router.get('/licenses/stats', getLicenseStats);

// ============================================
// Business Limits Routes (Refined Model)
// ============================================

/**
 * GET /api/business/limits
 * Get current limit usage (Refined Model)
 * Middleware: authenticate (app.js)
 * Response: { uploadCount, uploadLimit, downloadCount, downloadLimit, activeLicenseCount, activeLicenseLimit, tier }
 */
router.get('/limits', getBusinessLimits);

/**
 * GET /api/business/tier
 * Get tier information and upgrade options (Refined Model)
 * Middleware: authenticate (app.js)
 * Response: { currentTier, limits, features, upgradeOptions }
 */
router.get('/tier', getTierInfo);

// ============================================
// Stripe Connect Routes
// ============================================

/**
 * POST /api/business/stripe/connect/onboard
 * Onboard business to Stripe Connect
 * Middleware: authenticate (app.js)
 * Response: { accountId, onboardingUrl }
 */
router.post('/stripe/connect/onboard', onboardStripeConnect);

/**
 * GET /api/business/stripe/connect/status
 * Get Stripe Connect status
 * Middleware: authenticate (app.js)
 * Response: { status, accountId }
 */
router.get('/stripe/connect/status', getStripeConnectStatus);

// ============================================
// Payout Routes
// ============================================

/**
 * POST /api/business/payouts/request
 * Request payout
 * Middleware: authenticate (app.js)
 * Body: { amount: number }
 * Response: { payout: { id, amount, status }, transaction: { id } }
 */
router.post('/payouts/request', requestPayout);

module.exports = router;

