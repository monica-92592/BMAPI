const express = require('express');
const router = express.Router();
// TODO: Import collection controller functions
// const {
//   createCollection,
//   getCollectionById,
//   listCollections,
//   updateCollection,
//   deleteCollection,
//   addMediaToCollection,
//   removeMediaFromCollection,
//   getCollectionMembers,
//   joinCollection,
//   leaveCollection
// } = require('../controllers/collectionController');

// All routes require authentication (applied in app.js)
// All routes require Partner tier or higher (applied in app.js)

// POST /api/collections - Create new collection/pool (Partner tier only)
// router.post('/', createCollection);

// GET /api/collections - List collections
// router.get('/', listCollections);

// GET /api/collections/:id - Get collection details
// router.get('/:id', getCollectionById);

// PUT /api/collections/:id - Update collection
// router.put('/:id', updateCollection);

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

