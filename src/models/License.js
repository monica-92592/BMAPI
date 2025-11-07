const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  // Parties
  licensorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  licenseeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  mediaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media',
    required: true,
    index: true
  },
  
  // License details
  licenseType: {
    type: String,
    enum: ['commercial', 'editorial', 'exclusive'],
    required: true
  },
  terms: {
    duration: {
      type: String,
      trim: true
    },
    geographic: [{
      type: String,
      trim: true
    }],
    usage: {
      type: String,
      trim: true
    },
    modification: {
      type: Boolean,
      default: false
    }
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD',
    trim: true
  },
  
  // Revenue split (Refined Model)
  revenueSplit: {
    creator: {
      type: Number,
      default: 80
    },
    platform: {
      type: Number,
      default: 20
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'expired', 'cancelled', 'revoked'],
    default: 'pending',
    index: true
  },
  approvedAt: {
    type: Date
  },
  expiresAt: {
    type: Date,
    index: true
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  
  // Usage tracking
  usageReports: [{
    date: {
      type: Date,
      default: Date.now
    },
    usage: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    }
  }],
  
  // Financial
  totalPaid: {
    type: Number,
    default: 0
  },
  revenueDistribution: {
    licensorAmount: {
      type: Number,
      default: 0
    },
    platformAmount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for better query performance
licenseSchema.index({ licensorId: 1, status: 1 });
licenseSchema.index({ licenseeId: 1, status: 1 });
licenseSchema.index({ mediaId: 1, status: 1 });
licenseSchema.index({ status: 1, createdAt: -1 });
licenseSchema.index({ expiresAt: 1 });

const License = mongoose.model('License', licenseSchema);

module.exports = License;

