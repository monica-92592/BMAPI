/**
 * Transaction Model
 * 
 * Represents all financial transactions in the system including:
 * - Subscription payments (monthly tier fees)
 * - License payments (one-time media purchases)
 * - Payouts (transfers to creator bank accounts)
 * - Refunds (money returned to buyers)
 * - Chargebacks (disputed payments)
 * - Platform fees (commission retained)
 * 
 * Key Features:
 * - Automatic revenue split calculation based on tier
 * - Status workflow management (pending → completed → refunded/disputed)
 * - Chargeback reserve tracking via metadata
 * - Stripe integration references for all payment events
 * - Comprehensive validation of amounts and status transitions
 * 
 * Amount Flow:
 * grossAmount - stripeFee = netAmount
 * netAmount * creatorPercent = creatorShare
 * netAmount * platformPercent = platformShare
 * creatorShare + platformShare = netAmount (validated)
 * 
 * Status Workflow:
 * - pending: Payment initiated but not confirmed
 * - completed: Payment successful, revenue distributed
 * - failed: Payment declined or errored
 * - refunded: Buyer requested and received refund
 * - disputed: Chargeback filed by buyer's bank
 * 
 * @module models/Transaction
 * @requires mongoose
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
  // ===== TRANSACTION TYPE =====
  
  type: {
    type: String,
    required: [true, 'Transaction type is required'],
    enum: {
      values: [
        'subscription_payment',  // Monthly tier subscription payment
        'license_payment',       // One-time media license purchase
        'payout',               // Payment to creator's bank account
        'refund',               // Money returned to buyer
        'chargeback',           // Disputed payment by buyer's bank
        'platform_fee'          // Platform commission retained
      ],
      message: '{VALUE} is not a valid transaction type'
    },
    index: true
  },

  // ===== AMOUNT FIELDS =====
  
  // Total amount before any fees
  grossAmount: {
    type: Number,
    required: [true, 'Gross amount is required'],
    min: [0, 'Gross amount cannot be negative'],
    validate: {
      validator: function(value) {
        return Number.isFinite(value);
      },
      message: 'Gross amount must be a valid number'
    }
  },
  
  // Stripe's processing fee (2.9% + $0.30 for US cards)
  stripeFee: {
    type: Number,
    required: [true, 'Stripe fee is required'],
    min: [0, 'Stripe fee cannot be negative'],
    default: 0
  },
  
  // Amount after Stripe fee deduction
  netAmount: {
    type: Number,
    required: [true, 'Net amount is required'],
    min: [0, 'Net amount cannot be negative'],
    validate: {
      validator: function(value) {
        // netAmount should equal grossAmount - stripeFee
        return Math.abs(value - (this.grossAmount - this.stripeFee)) < 0.01;
      },
      message: 'Net amount must equal gross amount minus Stripe fee'
    }
  },
  
  // Creator's portion after platform fee
  creatorShare: {
    type: Number,
    default: 0,
    min: [0, 'Creator share cannot be negative']
  },
  
  // Platform's portion (commission)
  platformShare: {
    type: Number,
    default: 0,
    min: [0, 'Platform share cannot be negative']
  },

  // ===== STATUS WORKFLOW =====
  
  status: {
    type: String,
    required: true,
    enum: {
      values: [
        'pending',      // Payment initiated but not confirmed
        'completed',    // Payment successful and processed
        'failed',       // Payment failed (card declined, etc.)
        'refunded',     // Payment was refunded to buyer
        'disputed'      // Chargeback initiated by buyer
      ],
      message: '{VALUE} is not a valid transaction status'
    },
    default: 'pending',
    index: true
  },

  // ===== STRIPE REFERENCES =====
  
  // Stripe Payment Intent ID (for purchases)
  stripePaymentIntentId: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Stripe Charge ID
  stripeChargeId: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Stripe Payout ID (for creator payouts)
  stripePayoutId: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Stripe Refund ID
  stripeRefundId: {
    type: String,
    sparse: true,
    index: true
  },
  
  // Stripe Transfer ID (for Connect transfers)
  stripeTransferId: {
    type: String,
    sparse: true,
    index: true
  },

  // ===== RELATIONSHIPS =====
  
  // Who paid for this transaction
  payer: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: function() {
      // Payer required for payments, not for payouts
      return ['subscription_payment', 'license_payment'].includes(this.type);
    },
    index: true
  },
  
  // Who received money from this transaction
  payee: {
    type: Schema.Types.ObjectId,
    ref: 'Business',
    required: function() {
      // Payee required for license payments and payouts
      return ['license_payment', 'payout'].includes(this.type);
    },
    index: true
  },
  
  // Related license (if this is a license payment)
  relatedLicense: {
    type: Schema.Types.ObjectId,
    ref: 'License',
    sparse: true,
    index: true
  },

  // ===== METADATA & DESCRIPTION =====
  
  // Human-readable description
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // Flexible metadata storage
  // Used for: chargeback reserves, pool info, collection IDs, etc.
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
    // Common fields:
    // - chargebackReserve: Number (5% held for 90 days)
    // - reserveReleaseDate: Date
    // - reserveReleased: Boolean
    // - collectionId: ObjectId (for pool transactions)
    // - contributionPercent: Number (pool member contribution)
    // - reason: String (refund reason)
  },

  // ===== TIMESTAMPS =====
  
  // When transaction was completed successfully
  completedAt: {
    type: Date,
    index: true
  },
  
  // When transaction was refunded
  refundedAt: {
    type: Date
  }
  
}, {
  // Automatic timestamps (adds createdAt and updatedAt)
  timestamps: true
});

// ===== COMPOUND INDEXES =====

// Query transactions by payer and date (transaction history)
transactionSchema.index({ payer: 1, createdAt: -1 });

// Query transactions by payee and date (earnings history)
transactionSchema.index({ payee: 1, createdAt: -1 });

// Query by type and status (admin queries, analytics)
transactionSchema.index({ type: 1, status: 1 });

// Query by status and date (pending transactions)
transactionSchema.index({ status: 1, createdAt: -1 });

// Query by collection ID (pool transactions)
transactionSchema.index({ 'metadata.collectionId': 1 });

// Query unreleased reserves (for cron job)
transactionSchema.index({ 
  'metadata.reserveReleased': 1, 
  'metadata.reserveReleaseDate': 1 
});

// ===== INSTANCE METHODS =====

/**
 * Calculate and set revenue split based on tier configuration
 * @param {Object} tierRevenueSplit - { creator: 80, platform: 20 }
 * @returns {Transaction} this (for chaining)
 */
transactionSchema.methods.calculateRevenueSplit = function(tierRevenueSplit) {
  // Validate input
  if (!tierRevenueSplit || typeof tierRevenueSplit !== 'object') {
    throw new Error('tierRevenueSplit must be an object');
  }
  
  if (!tierRevenueSplit.creator || !tierRevenueSplit.platform) {
    throw new Error('tierRevenueSplit must have creator and platform percentages');
  }
  
  // Validate percentages add up to 100
  const total = tierRevenueSplit.creator + tierRevenueSplit.platform;
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(`Revenue split must total 100%, got ${total}%`);
  }
  
  // Calculate shares from net amount (after Stripe fee)
  this.creatorShare = (this.netAmount * tierRevenueSplit.creator) / 100;
  this.platformShare = (this.netAmount * tierRevenueSplit.platform) / 100;
  
  // Round to 2 decimal places (cents)
  this.creatorShare = Math.round(this.creatorShare * 100) / 100;
  this.platformShare = Math.round(this.platformShare * 100) / 100;
  
  // Verify math (allow 1 cent rounding difference)
  const calculatedNet = this.creatorShare + this.platformShare;
  if (Math.abs(calculatedNet - this.netAmount) > 0.01) {
    throw new Error(
      `Revenue split calculation error: ` +
      `creator (${this.creatorShare}) + platform (${this.platformShare}) ` +
      `!= net (${this.netAmount})`
    );
  }
  
  return this;
};

/**
 * Mark transaction as completed
 * Sets status to 'completed' and records completion timestamp
 * @returns {Transaction} this (for chaining)
 */
transactionSchema.methods.markCompleted = function() {
  // Validate current status
  if (this.status === 'completed') {
    throw new Error('Transaction is already completed');
  }
  
  if (this.status === 'refunded') {
    throw new Error('Cannot complete a refunded transaction');
  }
  
  if (this.status === 'disputed') {
    throw new Error('Cannot complete a disputed transaction');
  }
  
  // Update status and timestamp
  this.status = 'completed';
  this.completedAt = new Date();
  
  return this;
};

/**
 * Mark transaction as refunded
 * Sets status to 'refunded' and records refund timestamp
 * @returns {Transaction} this (for chaining)
 */
transactionSchema.methods.markRefunded = function() {
  // Validate current status - can only refund completed transactions
  if (this.status !== 'completed') {
    throw new Error(
      `Cannot refund transaction with status '${this.status}'. ` +
      `Only completed transactions can be refunded.`
    );
  }
  
  // Validate transaction type - certain types cannot be refunded
  if (this.type === 'payout') {
    throw new Error('Cannot refund a payout transaction');
  }
  
  if (this.type === 'refund') {
    throw new Error('Cannot refund a refund transaction');
  }
  
  // Update status and timestamp
  this.status = 'refunded';
  this.refundedAt = new Date();
  
  return this;
};

/**
 * Mark transaction as failed
 * Sets status to 'failed'
 * @returns {Transaction} this (for chaining)
 */
transactionSchema.methods.markFailed = function() {
  // Can only mark pending transactions as failed
  if (this.status !== 'pending') {
    throw new Error(
      `Cannot mark transaction as failed. Current status: '${this.status}'`
    );
  }
  
  this.status = 'failed';
  
  return this;
};

/**
 * Mark transaction as disputed (chargeback)
 * Sets status to 'disputed'
 * @returns {Transaction} this (for chaining)
 */
transactionSchema.methods.markDisputed = function() {
  // Can only dispute completed transactions
  if (this.status !== 'completed') {
    throw new Error(
      `Cannot dispute transaction with status '${this.status}'. ` +
      `Only completed transactions can be disputed.`
    );
  }
  
  this.status = 'disputed';
  
  return this;
};

// ===== STATIC METHODS =====

/**
 * Calculate Stripe processing fee
 * Formula: 2.9% + $0.30 for US cards
 * @param {Number} amount - Gross amount
 * @returns {Number} Stripe fee
 */
transactionSchema.statics.calculateStripeFee = function(amount) {
  if (amount < 0) {
    throw new Error('Amount cannot be negative');
  }
  
  const fee = (amount * 0.029) + 0.30;
  return Math.round(fee * 100) / 100; // Round to 2 decimals
};

/**
 * Find all transactions for a business (as payer or payee)
 * @param {ObjectId} businessId
 * @param {Object} options - Query options (type, status, sort, limit)
 * @returns {Promise<Array>} Array of transactions
 */
transactionSchema.statics.findByBusiness = function(businessId, options = {}) {
  const query = {
    $or: [
      { payer: businessId },
      { payee: businessId }
    ]
  };
  
  if (options.type) query.type = options.type;
  if (options.status) query.status = options.status;
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 100);
};

/**
 * Get revenue summary for a business
 * @param {ObjectId} businessId
 * @returns {Promise<Object>} Revenue summary
 */
transactionSchema.statics.getRevenueSummary = async function(businessId) {
  const earnings = await this.aggregate([
    {
      $match: {
        payee: businessId,
        status: 'completed',
        type: { $in: ['license_payment', 'platform_fee'] }
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$creatorShare' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);
  
  const spent = await this.aggregate([
    {
      $match: {
        payer: businessId,
        status: 'completed',
        type: { $in: ['license_payment', 'subscription_payment'] }
      }
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$grossAmount' },
        transactionCount: { $sum: 1 }
      }
    }
  ]);
  
  return {
    totalEarnings: earnings[0]?.totalEarnings || 0,
    earningsCount: earnings[0]?.transactionCount || 0,
    totalSpent: spent[0]?.totalSpent || 0,
    spentCount: spent[0]?.transactionCount || 0
  };
};

// ===== HOOKS =====

/**
 * Pre-save validation hook
 * Validates amount calculations and auto-sets timestamps
 */
transactionSchema.pre('save', function(next) {
  // Validate netAmount calculation
  const calculatedNet = this.grossAmount - this.stripeFee;
  if (Math.abs(this.netAmount - calculatedNet) > 0.01) {
    return next(new Error(
      `Net amount (${this.netAmount}) must equal ` +
      `gross amount (${this.grossAmount}) minus ` +
      `Stripe fee (${this.stripeFee})`
    ));
  }
  
  // If creatorShare and platformShare are set, validate they sum to netAmount
  if (this.creatorShare > 0 || this.platformShare > 0) {
    const calculatedTotal = this.creatorShare + this.platformShare;
    if (Math.abs(calculatedTotal - this.netAmount) > 0.01) {
      return next(new Error(
        `Revenue split (creator: ${this.creatorShare}, ` +
        `platform: ${this.platformShare}) must sum to ` +
        `net amount (${this.netAmount})`
      ));
    }
  }
  
  // Auto-set completedAt if status is completed and not already set
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Auto-set refundedAt if status is refunded and not already set
  if (this.status === 'refunded' && !this.refundedAt) {
    this.refundedAt = new Date();
  }
  
  next();
});

// ===== VIRTUAL FIELDS =====

/**
 * Check if transaction is completed
 */
transactionSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

/**
 * Check if transaction is pending
 */
transactionSchema.virtual('isPending').get(function() {
  return this.status === 'pending';
});

/**
 * Check if transaction can be refunded
 */
transactionSchema.virtual('canRefund').get(function() {
  return this.status === 'completed' && 
         ['license_payment', 'subscription_payment'].includes(this.type);
});

/**
 * Check if transaction is a payment (vs payout or refund)
 */
transactionSchema.virtual('isPayment').get(function() {
  return ['subscription_payment', 'license_payment'].includes(this.type);
});

/**
 * Check if transaction involves a creator payout
 */
transactionSchema.virtual('isPayout').get(function() {
  return this.type === 'payout';
});

// Ensure virtuals are included in JSON and Object representations
transactionSchema.set('toJSON', { virtuals: true });
transactionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Transaction', transactionSchema);

