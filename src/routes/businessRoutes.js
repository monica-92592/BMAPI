const express = require('express');
const router = express.Router();

// Import business controller functions
const {
  getBusinessLicenses,
  getLicenseStats,
  getBusinessLimits,
  getTierInfo
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

module.exports = router;

