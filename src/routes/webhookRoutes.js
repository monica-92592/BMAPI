/**
 * Webhook Routes
 * 
 * Handles webhook endpoints for external services (Stripe, etc.)
 * 
 * IMPORTANT: Webhook routes must be registered BEFORE body parser middleware
 * because webhook signature verification requires raw request body
 * 
 * @module routes/webhookRoutes
 */

const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controllers/webhookController');

/**
 * Stripe Webhook Endpoint
 * 
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events:
 * - Subscription lifecycle (created, updated, deleted)
 * - Invoice payments (succeeded, failed)
 * - Payment intents (succeeded, failed)
 * - Connect account updates
 * - Chargeback disputes
 * 
 * Note: Uses express.raw() middleware to preserve raw body for signature verification
 * No authentication required - webhooks are verified via Stripe signature
 */
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

module.exports = router;

