const Business = require('../models/Business');
const { getTierConfig, getTierLimit, TIER_CONFIG } = require('../config/tiers');

/**
 * Upgrade subscription tier
 * POST /api/subscriptions/upgrade
 * Middleware: authenticate
 * Body: { tier: 'contributor' | 'partner' | 'equityPartner' }
 * Process payment, update membership tier, reset limits (unlimited for paid tiers)
 */
const upgradeSubscription = async (req, res, next) => {
  try {
    const { tier } = req.body;
    const business = req.business;

    // Validate tier
    const validTiers = ['contributor', 'partner', 'equityPartner'];
    if (!tier || !validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier',
        message: `Tier must be one of: ${validTiers.join(', ')}`,
        validTiers: validTiers
      });
    }

    // Check if already at or above this tier
    const tierHierarchy = {
      free: 0,
      contributor: 1,
      partner: 2,
      equityPartner: 3
    };

    const currentTierLevel = tierHierarchy[business.membershipTier] || 0;
    const newTierLevel = tierHierarchy[tier];

    if (currentTierLevel >= newTierLevel) {
      return res.status(400).json({
        success: false,
        error: 'Invalid upgrade',
        message: `You are already at or above the ${tier} tier`,
        currentTier: business.membershipTier,
        requestedTier: tier
      });
    }

    // Get tier configuration
    const tierConfig = getTierConfig(tier);

    // Validate payment method
    const { paymentMethod } = req.body;
    const validPaymentMethods = ['stripe', 'paypal', 'credit_card', 'bank_transfer'];
    
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Payment method required',
        message: 'Payment method is required for subscription upgrade',
        validMethods: validPaymentMethods
      });
    }

    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method',
        message: `Payment method must be one of: ${validPaymentMethods.join(', ')}`,
        validMethods: validPaymentMethods,
        providedMethod: paymentMethod
      });
    }

    // Validate payment details based on method
    if (paymentMethod === 'stripe' || paymentMethod === 'credit_card') {
      const { paymentToken, cardLast4 } = req.body;
      if (!paymentToken) {
        return res.status(400).json({
          success: false,
          error: 'Payment token required',
          message: 'Payment token is required for card payments'
        });
      }
    } else if (paymentMethod === 'paypal') {
      const { paypalOrderId } = req.body;
      if (!paypalOrderId) {
        return res.status(400).json({
          success: false,
          error: 'PayPal order ID required',
          message: 'PayPal order ID is required for PayPal payments'
        });
      }
    }

    // TODO: Process payment
    // This is a placeholder - integrate with payment provider (Stripe, PayPal, etc.)
    // For now, we'll simulate successful payment
    const paymentResult = {
      success: true,
      transactionId: `txn_${Date.now()}`,
      amount: tierConfig.price,
      currency: 'USD',
      paymentMethod: paymentMethod
    };

    if (!paymentResult.success) {
      return res.status(402).json({
        success: false,
        error: 'Payment failed',
        message: 'Payment processing failed. Please try again.',
        paymentMethod: paymentMethod
      });
    }

    // Validate payment was processed successfully
    if (!paymentResult.transactionId) {
      return res.status(402).json({
        success: false,
        error: 'Payment processing error',
        message: 'Payment transaction ID is missing. Payment may not have been processed.'
      });
    }

    // Update business membership tier
    business.membershipTier = tier;
    business.subscriptionStatus = 'active';
    business.subscriptionStart = new Date();
    business.subscriptionExpiry = new Date();
    business.subscriptionExpiry.setMonth(business.subscriptionExpiry.getMonth() + 1); // 1 month from now
    business.subscriptionPaymentMethod = 'stripe'; // TODO: Get from payment provider
    business.subscriptionProvider = paymentResult.transactionId;

    // Reset limits for paid tiers (unlimited)
    // Upload, download, and active license limits are null (unlimited) for paid tiers
    // We don't need to reset the counts, but we can optionally reset them
    // For now, we'll keep the counts as they are since limits are checked dynamically

    await business.save();

    res.json({
      success: true,
      message: `Successfully upgraded to ${tierConfig.name} tier`,
      data: {
        tier: tier,
        tierName: tierConfig.name,
        price: tierConfig.price,
        subscriptionStatus: business.subscriptionStatus,
        subscriptionExpiry: business.subscriptionExpiry,
        limits: {
          upload: tierConfig.uploadLimit,
          download: tierConfig.downloadLimit,
          activeLicense: tierConfig.activeLicenseLimit
        },
        features: tierConfig.features,
        revenueSplit: tierConfig.revenueSplit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Downgrade subscription tier
 * POST /api/subscriptions/downgrade
 * Middleware: authenticate
 * Body: { tier: 'free' }
 * Cancel subscription, update membership tier, apply limits (25-50 uploads, 50 downloads/month, 3 active licenses)
 */
const downgradeSubscription = async (req, res, next) => {
  try {
    const { tier } = req.body;
    const business = req.business;

    // Validate tier (only allow downgrade to free)
    if (!tier || tier !== 'free') {
      return res.status(400).json({
        success: false,
        error: 'Invalid tier',
        message: 'You can only downgrade to the free tier',
        validTier: 'free'
      });
    }

    // Check if already on free tier
    if (business.membershipTier === 'free') {
      return res.status(400).json({
        success: false,
        error: 'Already on free tier',
        message: 'You are already on the free tier'
      });
    }

    // Get free tier configuration
    const freeTierConfig = getTierConfig('free');

    // Cancel subscription
    business.subscriptionStatus = 'cancelled';
    business.membershipTier = 'free';
    business.subscriptionExpiry = null;
    business.subscriptionPaymentMethod = null;
    business.subscriptionProvider = null;

    // Apply limits (Refined Model)
    // Note: We don't reset the counts, but limits will be enforced
    // Upload limit: 25 (or 50, configurable)
    // Download limit: 50/month (enforced monthly)
    // Active license limit: 3

    await business.save();

    res.json({
      success: true,
      message: 'Successfully downgraded to free tier',
      data: {
        tier: 'free',
        tierName: freeTierConfig.name,
        subscriptionStatus: business.subscriptionStatus,
        limits: {
          upload: freeTierConfig.uploadLimit,
          download: freeTierConfig.downloadLimit,
          activeLicense: freeTierConfig.activeLicenseLimit
        },
        features: freeTierConfig.features,
        revenueSplit: freeTierConfig.revenueSplit,
        note: 'Your current usage counts remain, but limits will be enforced'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get subscription status
 * GET /api/subscriptions/status
 * Middleware: authenticate
 */
const getSubscriptionStatus = async (req, res, next) => {
  try {
    const business = req.business;
    const tier = business.membershipTier || 'free';
    const tierConfig = getTierConfig(tier);

    // Check if subscription is expired
    const isExpired = business.subscriptionExpiry && new Date() > business.subscriptionExpiry;
    const isActive = business.subscriptionStatus === 'active' && !isExpired;

    res.json({
      success: true,
      data: {
        tier: tier,
        tierName: tierConfig.name,
        subscriptionStatus: isExpired ? 'expired' : business.subscriptionStatus,
        subscriptionStart: business.subscriptionStart,
        subscriptionExpiry: business.subscriptionExpiry,
        isActive: isActive,
        isExpired: isExpired,
        price: tierConfig.price,
        limits: {
          upload: tierConfig.uploadLimit,
          download: tierConfig.downloadLimit,
          activeLicense: tierConfig.activeLicenseLimit
        },
        features: tierConfig.features,
        revenueSplit: tierConfig.revenueSplit,
        paymentMethod: business.subscriptionPaymentMethod,
        subscriptionProvider: business.subscriptionProvider
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel subscription
 * POST /api/subscriptions/cancel
 * Middleware: authenticate
 * Downgrade to free tier, apply limits
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const business = req.business;

    // Check if already on free tier
    if (business.membershipTier === 'free') {
      return res.status(400).json({
        success: false,
        error: 'No active subscription',
        message: 'You are already on the free tier'
      });
    }

    // Get free tier configuration
    const freeTierConfig = getTierConfig('free');

    // Cancel subscription and downgrade to free
    business.subscriptionStatus = 'cancelled';
    business.membershipTier = 'free';
    business.subscriptionExpiry = null;
    business.subscriptionPaymentMethod = null;
    business.subscriptionProvider = null;

    // Apply limits (Refined Model)
    // Upload limit: 25 (or 50, configurable)
    // Download limit: 50/month (enforced monthly)
    // Active license limit: 3

    await business.save();

    res.json({
      success: true,
      message: 'Subscription cancelled successfully. You have been downgraded to the free tier.',
      data: {
        tier: 'free',
        tierName: freeTierConfig.name,
        subscriptionStatus: business.subscriptionStatus,
        limits: {
          upload: freeTierConfig.uploadLimit,
          download: freeTierConfig.downloadLimit,
          activeLicense: freeTierConfig.activeLicenseLimit
        },
        features: freeTierConfig.features,
        revenueSplit: freeTierConfig.revenueSplit,
        note: 'Your current usage counts remain, but limits will be enforced'
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  upgradeSubscription,
  downgradeSubscription,
  getSubscriptionStatus,
  cancelSubscription
};

