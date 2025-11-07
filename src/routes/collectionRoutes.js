const express = require('express');
const router = express.Router();

// Import collection controller functions
const {
  createCollection,
  updateCollection,
  listCollections,
  getCollectionDetails
} = require('../controllers/collectionController');

// Import auth middleware
const { authenticate, requirePartnerTier } = require('../middlewares/auth');

// All routes require authentication (applied in app.js)
// Partner tier routes require requirePartnerTier middleware

// ============================================
// Collection Management Routes (Partner Tier Only)
// ============================================

/**
 * POST /api/collections
 * Create collection
 * Middleware: authenticate, requirePartnerTier
 * Show upgrade prompt if not Partner tier
 */
router.post('/', authenticate, requirePartnerTier, createCollection);

/**
 * PUT /api/collections/:id
 * Update collection
 * Middleware: authenticate, requirePartnerTier
 */
router.put('/:id', authenticate, requirePartnerTier, updateCollection);

// ============================================
// Collection Viewing Routes (Optional Auth)
// ============================================

/**
 * GET /api/collections
 * List collections
 * Middleware: authenticate (optional) - handled by optionalAuth in app.js if needed
 */
router.get('/', listCollections);

/**
 * GET /api/collections/:id
 * Get collection details
 * Middleware: authenticate (optional) - handled by optionalAuth in app.js if needed
 */
router.get('/:id', getCollectionDetails);

// DELETE /api/collections/:id - Delete collection
// router.delete('/:id', deleteCollection);

// POST /api/collections/:id/media - Add media to collection
// router.post('/:id/media', addMediaToCollection);

// DELETE /api/collections/:id/media/:mediaId - Remove media from collection
// router.delete('/:id/media/:mediaId', removeMediaFromCollection);

// GET /api/collections/:id/members - Get collection members
// router.get('/:id/members', getCollectionMembers);

// POST /api/collections/:id/join - Join collection
// router.post('/:id/join', joinCollection);

// POST /api/collections/:id/leave - Leave collection
// router.post('/:id/leave', leaveCollection);

module.exports = router;

