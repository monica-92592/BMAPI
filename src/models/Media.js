const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: ['image', 'video', 'audio'],
    index: true
  },
  size: {
    type: Number,
    required: true
  },
  // Cloud storage URLs
  url: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String,
    required: false // For Cloudinary public_id
  },
  thumbnailUrl: {
    type: String,
    required: false
  },
  thumbnailCloudinaryId: {
    type: String,
    required: false
  },
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // Ownership (for future B2B features)
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: false,
    index: true
  },
  // Legacy path field (for migration period)
  path: {
    type: String,
    required: false
  },
  // Licensing fields
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  ownershipModel: {
    type: String,
    enum: ['individual', 'pooled'],
    default: 'individual'
  },
  isLicensable: {
    type: Boolean,
    default: false
  },
  licenseTypes: [{
    type: String,
    enum: ['commercial', 'editorial', 'exclusive']
  }],
  pricing: {
    basePrice: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true
    },
    licenseType: {
      type: String,
      trim: true
    }
  },
  usageRestrictions: {
    geographic: [{
      type: String,
      trim: true
    }],
    duration: {
      type: String,
      trim: true
    },
    modification: {
      type: Boolean,
      default: false
    }
  },
  copyrightInformation: {
    type: String,
    trim: true
  },
  // Licensing Status
  licenseCount: {
    type: Number,
    default: 0
  },
  activeLicenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'License'
  }],
  // Watermarking
  watermarkedPreviewUrl: {
    type: String,
    trim: true
  },
  // Pool Membership
  poolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection',
    required: false
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for better query performance
mediaSchema.index({ createdAt: -1 });
mediaSchema.index({ category: 1, createdAt: -1 });
mediaSchema.index({ originalName: 'text', filename: 'text' }); // Text search
// Licensing indexes
mediaSchema.index({ isLicensable: 1 });
mediaSchema.index({ ownershipModel: 1 });
mediaSchema.index({ poolId: 1 });
mediaSchema.index({ title: 'text', description: 'text', tags: 'text' }); // Text search for licensing fields

// Hook to increment Business uploadCount on media creation
mediaSchema.pre('save', async function(next) {
  if (this.isNew && this.ownerId) {
    try {
      const Business = require('./Business');
      const business = await Business.findById(this.ownerId);
      
      if (business) {
        // Check upload limit for free tier
        if (business.membershipTier === 'free') {
          const uploadLimit = 25; // or 50, configurable - could get from tier config
          if (business.uploadCount >= uploadLimit) {
            return next(new Error('Upload limit reached. Upgrade to Contributor for unlimited uploads.'));
          }
        }
        
        // Increment upload count
        business.uploadCount += 1;
        await business.save();
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Methods for licensing
/**
 * Check if media is licensable
 */
mediaSchema.methods.canBeLicensed = function() {
  // Check if media is licensable
  return this.isLicensable === true;
};

/**
 * Get pricing for a specific license type
 */
mediaSchema.methods.getPriceForLicenseType = function(licenseType) {
  if (!this.pricing || !this.pricing.basePrice) {
    return null;
  }
  
  // For now, return base price. Can be extended to have different prices per license type
  return {
    price: this.pricing.basePrice,
    currency: this.pricing.currency || 'USD',
    licenseType: licenseType || this.pricing.licenseType
  };
};

/**
 * Check if usage meets restrictions
 */
mediaSchema.methods.checkUsageRestrictions = function(usage) {
  if (!this.usageRestrictions) {
    return { valid: true };
  }
  
  const restrictions = this.usageRestrictions;
  const errors = [];
  
  // Check geographic restrictions
  if (restrictions.geographic && restrictions.geographic.length > 0) {
    if (usage.geographic && !restrictions.geographic.includes(usage.geographic)) {
      errors.push(`Geographic restriction: ${usage.geographic} not allowed. Allowed: ${restrictions.geographic.join(', ')}`);
    }
  }
  
  // Check modification restrictions
  if (restrictions.modification === false && usage.modification === true) {
    errors.push('Modification not allowed for this license');
  }
  
  // Check duration restrictions
  if (restrictions.duration && usage.duration) {
    // Can add duration validation logic here
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
};

/**
 * Generate watermarked preview (placeholder - actual implementation would use image processing)
 */
mediaSchema.methods.generateWatermarkedPreview = async function() {
  // Placeholder for watermarked preview generation
  // Actual implementation would:
  // 1. Download image from Cloudinary
  // 2. Add watermark using image processing library
  // 3. Upload watermarked version to Cloudinary
  // 4. Update watermarkedPreviewUrl
  
  if (this.category !== 'image') {
    return { success: false, message: 'Watermarking only available for images' };
  }
  
  // For now, return placeholder
  return {
    success: true,
    message: 'Watermarked preview generation not yet implemented',
    watermarkedPreviewUrl: this.watermarkedPreviewUrl || null
  };
};

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;

