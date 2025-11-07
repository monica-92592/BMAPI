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
    ref: 'User',
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

const Media = mongoose.model('Media', mediaSchema);

module.exports = Media;

