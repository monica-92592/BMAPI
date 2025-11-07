const express = require('express');
const router = express.Router();

// Import subscription controller functions
const {
  upgradeSubscription,
  downgradeSubscription,
  getSubscriptionStatus,
  cancelSubscription
} = require('../controllers/subscriptionController');

// All routes require authentication (applied in app.js)

// ============================================
// Subscription Management Routes (Refined Model)
// ============================================

/**
 * POST /api/subscriptions/upgrade
 * Upgrade subscription tier
 * Middleware: authenticate (app.js)
 * Body: { tier: 'contributor' | 'partner' | 'equityPartner' }
 * Process payment, update membership tier, reset limits (unlimited for paid tiers)
 */
router.post('/upgrade', upgradeSubscription);

/**
 * POST /api/subscriptions/downgrade
 * Downgrade subscription tier
 * Middleware: authenticate (app.js)
 * Body: { tier: 'free' }
 * Cancel subscription, update membership tier, apply limits (25-50 uploads, 50 downloads/month, 3 active licenses)
 */
router.post('/downgrade', downgradeSubscription);

/**
 * GET /api/subscriptions/status
 * Get subscription status
 * Middleware: authenticate (app.js)
 */
router.get('/status', getSubscriptionStatus);

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription
 * Middleware: authenticate (app.js)
 * Downgrade to free tier, apply limits
 */
router.post('/cancel', cancelSubscription);

module.exports = router;

