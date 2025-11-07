const Collection = require('../models/Collection');
const Business = require('../models/Business');
const Media = require('../models/Media');

/**
 * Create collection
 * POST /api/collections
 * Middleware: authenticate, requirePartnerTier
 * Show upgrade prompt if not Partner tier
 */
const createCollection = async (req, res, next) => {
  try {
    const { name, description, poolType, revenueSharingModel, externalLicensingTerms, poolPricing } = req.body;
    const ownerId = req.business._id;

    // Validate required fields
    if (!name || !poolType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'name and poolType are required'
      });
    }

    // Validate pool type
    if (!['competitive', 'complementary'].includes(poolType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pool type',
        message: 'poolType must be either "competitive" or "complementary"'
      });
    }

    // Create collection
    const collection = await Collection.create({
      name,
      description,
      poolType,
      ownerId,
      memberBusinesses: [ownerId], // Owner is automatically a member
      mediaAssets: [],
      revenueSharingModel: revenueSharingModel || { split: 'equal' },
      externalLicensingTerms,
      poolPricing: poolPricing || {},
      status: 'active'
    });

    // Add collection to owner's collectionsOwned
    const owner = await Business.findById(ownerId);
    if (owner) {
      if (!owner.collectionsOwned) {
        owner.collectionsOwned = [];
      }
      owner.collectionsOwned.push(collection._id);
      await owner.save();
    }

    // Populate collection details
    await collection.populate('ownerId', 'companyName companyType industry');
    await collection.populate('memberBusinesses', 'companyName companyType industry');

    res.status(201).json({
      success: true,
      message: 'Collection created successfully',
      data: collection
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Update collection
 * PUT /api/collections/:id
 * Middleware: authenticate, requirePartnerTier
 */
const updateCollection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, poolType, revenueSharingModel, externalLicensingTerms, poolPricing, isPublic, allowNewMembers } = req.body;
    const businessId = req.business._id;

    const collection = await Collection.findById(id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found',
        message: `Collection with ID ${id} not found`
      });
    }

    // Check if business is the owner
    if (collection.ownerId.toString() !== businessId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the collection owner can update this collection'
      });
    }

    // Update fields
    if (name !== undefined) collection.name = name;
    if (description !== undefined) collection.description = description;
    if (poolType !== undefined) {
      if (!['competitive', 'complementary'].includes(poolType)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid pool type',
          message: 'poolType must be either "competitive" or "complementary"'
        });
      }
      collection.poolType = poolType;
    }
    if (revenueSharingModel !== undefined) collection.revenueSharingModel = revenueSharingModel;
    if (externalLicensingTerms !== undefined) collection.externalLicensingTerms = externalLicensingTerms;
    if (poolPricing !== undefined) collection.poolPricing = poolPricing;
    if (isPublic !== undefined) collection.isPublic = isPublic;
    if (allowNewMembers !== undefined) collection.allowNewMembers = allowNewMembers;

    await collection.save();

    // Populate collection details
    await collection.populate('ownerId', 'companyName companyType industry');
    await collection.populate('memberBusinesses', 'companyName companyType industry');
    await collection.populate('mediaAssets', 'title description url thumbnailUrl');

    res.json({
      success: true,
      message: 'Collection updated successfully',
      data: collection
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Collection not found',
        message: `Collection with ID ${req.params.id} not found`
      });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * List collections
 * GET /api/collections
 * Middleware: authenticate (optional)
 */
const listCollections = async (req, res, next) => {
  try {
    const { poolType, status, isPublic, ownerId } = req.query;
    const businessId = req.business?._id;

    // Build query
    const query = {};

    // Filter by pool type
    if (poolType) {
      query.poolType = poolType;
    }

    // Filter by status
    if (status) {
      query.status = status;
    } else {
      // Default: only show active collections
      query.status = 'active';
    }

    // Filter by owner
    if (ownerId) {
      query.ownerId = ownerId;
    }

    // Handle public/private and authentication
    if (businessId) {
      // If authenticated, show public collections OR collections where business is owner/member
      const orConditions = [];
      
      // Always include public collections
      orConditions.push({ isPublic: true });
      
      // Include collections where business is owner
      orConditions.push({ ownerId: businessId });
      
      // Include collections where business is a member
      orConditions.push({ memberBusinesses: businessId });
      
      query.$or = orConditions;
      
      // If isPublic filter is explicitly set, we need to handle it differently
      if (isPublic !== undefined) {
        const isPublicValue = isPublic === 'true';
        if (!isPublicValue) {
          // If filtering for private only, remove public from $or
          query.$or = query.$or.filter(condition => !condition.isPublic);
        }
      }
    } else {
      // If not authenticated, only show public collections
      query.isPublic = true;
      
      // If isPublic filter is explicitly set
      if (isPublic !== undefined) {
        query.isPublic = isPublic === 'true';
      }
    }

    const collections = await Collection.find(query)
      .populate('ownerId', 'companyName companyType industry')
      .populate('memberBusinesses', 'companyName companyType industry')
      .select('-mediaAssets') // Don't populate media assets in list view for performance
      .sort({ createdAt: -1 })
      .lean();

    // Add media count
    const collectionsWithCounts = await Promise.all(
      collections.map(async (collection) => {
        const mediaCount = await Collection.findById(collection._id).populate('mediaAssets');
        return {
          ...collection,
          mediaCount: mediaCount?.mediaAssets?.length || 0,
          memberCount: collection.memberBusinesses?.length || 0
        };
      })
    );

    res.json({
      success: true,
      count: collectionsWithCounts.length,
      data: collectionsWithCounts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get collection details
 * GET /api/collections/:id
 * Middleware: authenticate (optional)
 */
const getCollectionDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const businessId = req.business?._id;

    const collection = await Collection.findById(id)
      .populate('ownerId', 'companyName companyType industry membershipTier')
      .populate('memberBusinesses', 'companyName companyType industry membershipTier')
      .populate('mediaAssets', 'title description url thumbnailUrl isLicensable licenseTypes pricing');

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: 'Collection not found',
        message: `Collection with ID ${id} not found`
      });
    }

    // Check access (public collections or member/owner)
    if (!collection.isPublic) {
      if (!businessId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'This collection is private. Please authenticate to access.'
        });
      }

      const isOwner = collection.ownerId._id.toString() === businessId.toString();
      const isMember = collection.memberBusinesses.some(
        member => member._id.toString() === businessId.toString()
      );

      if (!isOwner && !isMember) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'You do not have access to this collection'
        });
      }
    }

    res.json({
      success: true,
      data: collection
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({
        success: false,
        error: 'Collection not found',
        message: `Collection with ID ${req.params.id} not found`
      });
    }
    next(error);
  }
};

module.exports = {
  createCollection,
  updateCollection,
  listCollections,
  getCollectionDetails
};

