const express = require('express');
const router = express.Router();
// TODO: Import subscription controller functions
// const {
//   getSubscriptionInfo,
//   upgradeSubscription,
//   downgradeSubscription,
//   cancelSubscription,
//   renewSubscription,
//   getSubscriptionHistory
// } = require('../controllers/subscriptionController');

// All routes require authentication (applied in app.js)

// GET /api/subscriptions - Get current subscription info
// router.get('/', getSubscriptionInfo);

// POST /api/subscriptions/upgrade - Upgrade subscription tier
// router.post('/upgrade', upgradeSubscription);

// POST /api/subscriptions/downgrade - Downgrade subscription tier
// router.post('/downgrade', downgradeSubscription);

// POST /api/subscriptions/cancel - Cancel subscription
// router.post('/cancel', cancelSubscription);

// POST /api/subscriptions/renew - Renew expired subscription
// router.post('/renew', renewSubscription);

// GET /api/subscriptions/history - Get subscription history
// router.get('/history', getSubscriptionHistory);

module.exports = router;

