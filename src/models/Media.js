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
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for better query performance
mediaSchema.index({ createdAt: -1 });
mediaSchema.index({ category: 1, createdAt: -1 });
mediaSchema.index({ originalName: 'text', filename: 'text' }); // Text search

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

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;

