const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const businessSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    required: false
  },
  // Business profile fields
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  companyType: {
    type: String,
    required: true,
    enum: ['photography', 'design', 'agency', 'videography', 'audio', 'other'],
    trim: true
  },
  industry: {
    type: String,
    required: true,
    trim: true
  },
  specialty: {
    type: String,
    trim: true
  },
  businessDescription: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  logo: {
    type: String,
    trim: true
  },
  // Membership tier fields
  membershipTier: {
    type: String,
    enum: ['free', 'contributor', 'partner', 'equityPartner'],
    default: 'free'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'cancelled'],
    default: 'active'
  },
  subscriptionExpiry: {
    type: Date
  },
  subscriptionStart: {
    type: Date
  },
  subscriptionPaymentMethod: {
    type: String,
    trim: true
  },
  subscriptionProvider: {
    type: String,
    trim: true
  },
  // Stripe Connect fields
  stripeConnectAccountId: {
    type: String,
    sparse: true,
    index: true
  },
  stripeConnectStatus: {
    type: String,
    enum: ['not_started', 'pending', 'active', 'disabled'],
    default: 'not_started'
  },
  stripeConnectOnboardedAt: {
    type: Date
  },
  // Stripe Customer fields
  stripeCustomerId: {
    type: String,
    sparse: true,
    index: true
  },
  stripeSubscriptionId: {
    type: String,
    sparse: true
  },
  // Resource limit tracking
  uploadCount: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  activeLicenseCount: {
    type: Number,
    default: 0
  },
  lastUploadReset: {
    type: Date
  },
  lastDownloadReset: {
    type: Date
  },
  // Financial fields
  revenueBalance: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  balanceStatus: {
    type: String,
    enum: ['positive', 'negative', 'suspended'],
    default: 'positive'
  },
  transactionHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction'
  }],
  // Governance fields
  votingPower: {
    type: Number,
    default: 0
  },
  governanceParticipation: {
    type: Number,
    default: 0
  },
  proposalsCreated: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal'
  }],
  votesCast: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vote'
  }],
  // Licensing fields
  mediaPortfolio: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Media'
  }],
  licensesAsLicensor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'License'
  }],
  licensesAsLicensee: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'License'
  }],
  // Collection fields
  collectionsOwned: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection'
  }],
  collectionsMemberOf: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
businessSchema.index({ membershipTier: 1 });
businessSchema.index({ companyName: 1 });
businessSchema.index({ industry: 1 });
businessSchema.index({ uploadCount: 1 });
businessSchema.index({ downloadCount: 1 });
businessSchema.index({ activeLicenseCount: 1 });

// Hash password before saving
businessSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
businessSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
businessSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.verificationToken;
  return obj;
};

// Virtual for calculating voting power
businessSchema.virtual('calculatedVotingPower').get(function() {
  // Calculate voting power based on tier
  const tierPower = {
    'free': 1,
    'contributor': 2,
    'partner': 3,
    'equityPartner': 5
  };
  
  const basePower = tierPower[this.membershipTier] || 0;
  // Add governance participation bonus (1 vote per 10 participations)
  const participationBonus = Math.floor((this.governanceParticipation || 0) / 10);
  
  return basePower + participationBonus;
});

// Method to calculate revenue split percentage
businessSchema.methods.getRevenueSplit = function() {
  switch (this.membershipTier) {
    case 'free':
      return { creator: 80, platform: 20 };
    case 'contributor':
      return { creator: 85, platform: 15 };
    case 'partner':
      return { creator: 90, platform: 10 };
    case 'equityPartner':
      return { creator: 95, platform: 5 };
    default:
      return { creator: 80, platform: 20 };
  }
};

// Method to check upload limit
businessSchema.methods.canUpload = function() {
  if (this.membershipTier === 'free') {
    return this.uploadCount < 25; // or 50, configurable
  }
  return true; // Unlimited for paid tiers
};

// Method to check download limit
businessSchema.methods.canDownload = function() {
  if (this.membershipTier === 'free') {
    // Check if monthly reset needed
    const now = new Date();
    const lastReset = this.lastDownloadReset || this.createdAt;
    const monthDiff = (now.getFullYear() - lastReset.getFullYear()) * 12 + 
                      (now.getMonth() - lastReset.getMonth());
    
    if (monthDiff >= 1) {
      // Reset download count
      this.downloadCount = 0;
      this.lastDownloadReset = now;
    }
    
    return this.downloadCount < 50;
  }
  return true; // Unlimited for paid tiers
};

// Method to check active license limit
businessSchema.methods.canCreateActiveLicense = function() {
  if (this.membershipTier === 'free') {
    return this.activeLicenseCount < 3;
  }
  return true; // Unlimited for paid tiers
};

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;

