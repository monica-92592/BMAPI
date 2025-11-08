const Business = require('../models/Business');
const Transaction = require('../models/Transaction');
const { getTierConfig, getTierLimit, TIER_CONFIG } = require('../config/tiers');
const StripeService = require('../services/stripeService');
const { calculateStripeFee } = require('../utils/revenueCalculation');

/**
 * Upgrade subscription tier
 * POST /api/subscriptions/upgrade
 * Middleware: authenticate
 * Body: { tier: 'contributor' | 'partner' | 'equityPartner', paymentMethodId: string }
 * Process payment, update membership tier, reset limits (unlimited for paid tiers)
 */
const upgradeSubscription = async (req, res, next) => {
  try {
    const businessId = req.business._id; // From authenticate middleware
    const { tier, paymentMethodId } = req.body;
    
    // Validate tier
    const validTiers = ['contributor', 'partner', 'equityPartner'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_tier',
        message: 'Invalid tier specified'
      });
    }
    
    // Get price ID from .env
    let priceIdKey;
    if (tier === 'equityPartner') {
      priceIdKey = 'STRIPE_PRICE_EQUITY_PARTNER';
    } else {
      priceIdKey = `STRIPE_PRICE_${tier.toUpperCase()}`;
    }
    const priceId = process.env[priceIdKey];
    if (!priceId) {
      return res.status(500).json({
        success: false,
        error: 'price_not_configured',
        message: 'Subscription price not configured'
      });
    }
    
    const business = await Business.findById(businessId);
    const stripeService = new StripeService();
    
    // Create or get customer
    let customerId = business.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(businessId, business.email);
      customerId = customer.id;
      business.stripeCustomerId = customerId;
    }
    
    // Attach payment method
    await stripeService.createPaymentMethod(paymentMethodId, customerId);
    
    // Create subscription
    const subscription = await stripeService.createSubscription(customerId, priceId, {
      businessId,
      tier
    });
    
    // Calculate transaction amounts
    const tierConfig = getTierConfig(tier);
    const grossAmount = tierConfig.price * 100; // Convert to cents
    const stripeFee = calculateStripeFee(grossAmount);
    const netAmount = grossAmount - stripeFee;
    
    // Create transaction record
    const transaction = await Transaction.create({
      type: 'subscription_payment',
      grossAmount,
      stripeFee,
      netAmount,
      platformShare: netAmount, // Platform keeps all subscription revenue
      creatorShare: 0,
      status: 'completed',
      stripePaymentIntentId: subscription.latest_invoice?.payment_intent,
      stripeChargeId: subscription.latest_invoice?.charge,
      payer: businessId,
      description: `${tier} subscription payment`,
      completedAt: new Date()
    });
    
    // Update business
    business.membershipTier = tier;
    business.subscriptionStatus = 'active';
    business.stripeSubscriptionId = subscription.id;
    business.subscriptionExpiry = new Date(subscription.current_period_end * 1000);
    await business.save();
    
    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end
        },
        transaction: {
          id: transaction._id,
          amount: grossAmount
        }
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
 * Cancel Stripe subscription, downgrade to free tier, apply limits
 */
const cancelSubscription = async (req, res, next) => {
  try {
    const businessId = req.business._id; // From authenticate middleware
    const business = await Business.findById(businessId);
    
    if (!business.stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'no_subscription',
        message: 'No active subscription found'
      });
    }
    
    const stripeService = new StripeService();
    const subscription = await stripeService.cancelSubscription(business.stripeSubscriptionId);
    
    // Update business
    business.membershipTier = 'free';
    business.subscriptionStatus = 'cancelled';
    business.subscriptionExpiry = null;
    business.stripeSubscriptionId = null;
    await business.save();
    
    res.json({
      success: true,
      data: {
        subscription: {
          id: subscription.id,
          status: subscription.status
        }
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

