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
    default: 0
  },
  memberEarnings: [{
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business'
    },
    amount: {
      type: Number,
      default: 0
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

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;

