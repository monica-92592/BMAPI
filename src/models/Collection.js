const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  poolType: {
    type: String,
    enum: ['competitive', 'complementary'],
    required: true,
    index: true
  },
  
  // Owner
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  
  // Members
  memberBusinesses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business'
  }],
  
  // Media assets in collection
  mediaAssets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }],
  
  // Revenue sharing model
  revenueSharingModel: {
    split: {
      type: String,
      enum: ['equal', 'proportional', 'custom'],
      default: 'equal'
    },
    distribution: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Financial
  totalRevenue: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  totalLicenses: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },
  memberEarnings: [{
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: 0
    },
    licenseCount: {
      type: Number,
      default: 0,
      min: 0
    },
    contributionPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  }],
  
  // Licensing
  externalLicensingTerms: {
    type: String,
    trim: true
  },
  poolPricing: {
    basePrice: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true
    },
    licenseTypes: [{
      type: String,
      enum: ['commercial', 'editorial', 'exclusive']
    }]
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    index: true
  },
  
  // Settings
  isPublic: {
    type: Boolean,
    default: true
  },
  allowNewMembers: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for better query performance
collectionSchema.index({ ownerId: 1, status: 1 });
collectionSchema.index({ poolType: 1, status: 1 });
collectionSchema.index({ status: 1, createdAt: -1 });
collectionSchema.index({ name: 'text', description: 'text' }); // Text search
// Note: totalRevenue and totalLicenses are indexed via index: true in field definitions

/**
 * Update collection earnings from a transaction
 * 
 * Increments totalRevenue and totalLicenses, and updates or creates
 * member earnings record based on transaction data.
 * 
 * @param {object} transaction - Transaction object with creatorShare, metadata, etc.
 * @returns {Promise<object>} Updated collection document
 * @throws {Error} If transaction is invalid or collection cannot be updated
 * 
 * @example
 * const transaction = {
 *   creatorShare: 82.28,
 *   metadata: {
 *     collectionId: collection._id,
 *     contributionPercent: 50
 *   }
 * };
 * await collection.updateEarnings(transaction);
 */
collectionSchema.methods.updateEarnings = async function(transaction) {
  // Validate transaction
  if (!transaction) {
    throw new Error('Transaction is required');
  }
  
  // Validate transaction has creatorShare
  if (typeof transaction.creatorShare !== 'number' || transaction.creatorShare < 0) {
    throw new Error('Transaction must have a valid creatorShare');
  }
  
  // Validate transaction has metadata with collectionId
  if (!transaction.metadata || !transaction.metadata.collectionId) {
    throw new Error('Transaction must have metadata.collectionId');
  }
  
  // Validate collectionId matches this collection
  if (transaction.metadata.collectionId.toString() !== this._id.toString()) {
    throw new Error('Transaction collectionId does not match this collection');
  }
  
  // Get member businessId from transaction (payee is the member)
  const memberBusinessId = transaction.payee || transaction.metadata.businessId;
  if (!memberBusinessId) {
    throw new Error('Transaction must have payee or metadata.businessId');
  }
  
  // Get contribution percent from transaction metadata
  const contributionPercent = transaction.metadata.contributionPercent || 0;
  
  // Increment total revenue
  this.totalRevenue = (this.totalRevenue || 0) + transaction.creatorShare;
  
  // Increment total licenses
  this.totalLicenses = (this.totalLicenses || 0) + 1;
  
  // Find or create member earnings record
  let memberEarning = this.memberEarnings.find(
    earning => earning.businessId.toString() === memberBusinessId.toString()
  );
  
  if (memberEarning) {
    // Update existing member earnings
    memberEarning.totalEarned = (memberEarning.totalEarned || 0) + transaction.creatorShare;
    memberEarning.licenseCount = (memberEarning.licenseCount || 0) + 1;
    // Update contribution percent if provided
    if (contributionPercent > 0) {
      memberEarning.contributionPercent = contributionPercent;
    }
  } else {
    // Create new member earnings record
    this.memberEarnings.push({
      businessId: memberBusinessId,
      totalEarned: transaction.creatorShare,
      licenseCount: 1,
      contributionPercent: contributionPercent
    });
  }
  
  // Round totalRevenue to 2 decimal places
  this.totalRevenue = Math.round(this.totalRevenue * 100) / 100;
  
  // Save and return updated collection
  return await this.save();
};

/**
 * Get pool earnings breakdown for a collection
 * 
 * Static method to retrieve collection and return earnings breakdown
 * including total revenue, total licenses, and member earnings.
 * 
 * @param {string|ObjectId} collectionId - Collection ID
 * @returns {Promise<object>} Earnings breakdown object with:
 *   - collectionId: Collection ID
 *   - totalRevenue: Total revenue for the pool
 *   - totalLicenses: Total number of licenses
 *   - memberEarnings: Array of member earnings
 *   - memberCount: Number of members with earnings
 * @throws {Error} If collection not found
 * 
 * @example
 * const earnings = await Collection.getPoolEarnings(collectionId);
 * // Returns: {
 * //   collectionId: '...',
 * //   totalRevenue: 1000.00,
 * //   totalLicenses: 10,
 * //   memberEarnings: [...],
 * //   memberCount: 3
 * // }
 */
collectionSchema.statics.getPoolEarnings = async function(collectionId) {
  // Validate collectionId
  if (!collectionId) {
    throw new Error('Collection ID is required');
  }
  
  // Find collection by ID
  const collection = await this.findById(collectionId);
  
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  // Return earnings breakdown
  return {
    collectionId: collection._id,
    collectionName: collection.name,
    totalRevenue: collection.totalRevenue || 0,
    totalLicenses: collection.totalLicenses || 0,
    memberEarnings: collection.memberEarnings || [],
    memberCount: collection.memberEarnings ? collection.memberEarnings.length : 0
  };
};

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;

