const express = require('express');
const router = express.Router();

// Import auth middleware
const {
  checkDownloadLimit,
  checkActiveLicenseLimit,
  requireVerifiedBusiness
} = require('../middlewares/auth');

// Import license controller functions
const {
  createLicenseRequest,
  getPendingLicenses,
  getLicenseRequests,
  listLicenses,
  getLicenseById,
  approveLicense,
  rejectLicense,
  cancelLicense,
  getActiveLicenses,
  getExpiredLicenses,
  renewLicense
} = require('../controllers/licenseController');

// All routes require authentication (applied in app.js)

// ============================================
// License Creation Routes (Refined Model)
// ============================================

/**
 * POST /api/licenses
 * Create license request
 * Middleware: authenticate (app.js), requireVerifiedBusiness, checkDownloadLimit
 * Body: { mediaId, licenseType, terms, price }
 * Increment download count on success
 */
router.post('/', requireVerifiedBusiness, checkDownloadLimit, createLicenseRequest);

/**
 * GET /api/licenses/pending
 * Get pending licenses (as licensor)
 * Middleware: authenticate (app.js)
 */
router.get('/pending', getPendingLicenses);

/**
 * GET /api/licenses/requests
 * Get license requests (as licensee)
 * Middleware: authenticate (app.js)
 */
router.get('/requests', getLicenseRequests);

// ============================================
// License Management Routes (Refined Model)
// ============================================

/**
 * GET /api/licenses
 * List all licenses
 * Middleware: authenticate (app.js)
 * Query params: status, type, asLicensor, asLicensee
 */
router.get('/', listLicenses);

/**
 * GET /api/licenses/:id
 * Get license details
 * Middleware: authenticate (app.js)
 */
router.get('/:id', getLicenseById);

/**
 * PUT /api/licenses/:id/approve
 * Approve license
 * Middleware: authenticate (app.js), requireVerifiedBusiness, checkActiveLicenseLimit
 * Increment active license count on success
 */
router.put('/:id/approve', requireVerifiedBusiness, checkActiveLicenseLimit, approveLicense);

/**
 * PUT /api/licenses/:id/reject
 * Reject license
 * Middleware: authenticate (app.js), requireVerifiedBusiness
 * Body: { reason }
 */
router.put('/:id/reject', requireVerifiedBusiness, rejectLicense);

/**
 * PUT /api/licenses/:id/cancel
 * Cancel license
 * Middleware: authenticate (app.js)
 * Decrement active license count on success
 */
router.put('/:id/cancel', cancelLicense);

// ============================================
// License Status Routes
// ============================================

/**
 * GET /api/licenses/active
 * Get active licenses
 * Middleware: authenticate (app.js)
 */
router.get('/active', getActiveLicenses);

/**
 * GET /api/licenses/expired
 * Get expired licenses
 * Middleware: authenticate (app.js)
 * Decrement active license count on expiry
 */
router.get('/expired', getExpiredLicenses);

/**
 * PUT /api/licenses/:id/renew
 * Renew license
 * Middleware: authenticate (app.js), checkActiveLicenseLimit
 * Body: { duration }
 */
router.put('/:id/renew', checkActiveLicenseLimit, renewLicense);

// ============================================
// License Usage Routes
// ============================================

/**
 * GET /api/licenses/:id/usage
 * Get license usage reports
 * Middleware: authenticate (app.js)
 */
// router.get('/:id/usage', getLicenseUsage);

module.exports = router;

