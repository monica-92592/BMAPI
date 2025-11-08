/**
 * Webhook Controller
 * 
 * Handles Stripe webhook events for:
 * - Subscription lifecycle (created, updated, deleted)
 * - Invoice payments (succeeded, failed)
 * - Payment intents (succeeded, failed)
 * - Connect account updates
 * - Chargeback disputes
 * 
 * @module controllers/webhookController
 */

const stripe = require('../config/stripe');
const Business = require('../models/Business');
const Transaction = require('../models/Transaction');
const License = require('../models/License');
const { calculateStripeFee } = require('../utils/revenueCalculation');

/**
 * Handle Stripe webhook events
 * 
 * Verifies webhook signature and routes events to appropriate handlers
 * 
 * @route POST /api/webhooks/stripe
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!stripe) {
    console.error('Stripe is not initialized');
    return res.status(500).json({ error: 'Stripe not initialized' });
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed', message: error.message });
  }
};

/**
 * Handle subscription created event
 * 
 * Updates business with subscription details when a new subscription is created
 * 
 * @param {object} subscription - Stripe subscription object
 */
async function handleSubscriptionCreated(subscription) {
  try {
    const businessId = subscription.metadata?.businessId;
    
    if (!businessId) {
      console.log('Subscription created without businessId in metadata');
      return;
    }

    const business = await Business.findById(businessId);
    
    if (!business) {
      console.log(`Business not found for subscription: ${subscription.id}`);
      return;
    }

    // Update business with subscription details
    business.membershipTier = subscription.metadata?.tier || business.membershipTier;
    business.subscriptionStatus = 'active';
    business.stripeSubscriptionId = subscription.id;
    business.subscriptionExpiry = new Date(subscription.current_period_end * 1000);
    
    await business.save();
    
    console.log(`Subscription created for business: ${businessId}`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
    throw error;
  }
}

/**
 * Handle subscription updated event
 * 
 * Updates business when subscription status or details change
 * 
 * @param {object} subscription - Stripe subscription object
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    const businessId = subscription.metadata?.businessId;
    
    if (!businessId) {
      console.log('Subscription updated without businessId in metadata');
      return;
    }

    const business = await Business.findById(businessId);
    
    if (!business) {
      console.log(`Business not found for subscription: ${subscription.id}`);
      return;
    }

    // Update subscription status
    if (subscription.status === 'active') {
      business.subscriptionStatus = 'active';
      business.membershipTier = subscription.metadata?.tier || business.membershipTier;
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
      business.subscriptionStatus = 'cancelled';
      business.membershipTier = 'free';
    } else if (subscription.status === 'past_due') {
      business.subscriptionStatus = 'past_due';
    }

    // Update subscription expiry
    if (subscription.current_period_end) {
      business.subscriptionExpiry = new Date(subscription.current_period_end * 1000);
    }

    await business.save();
    
    console.log(`Subscription updated for business: ${businessId}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

/**
 * Handle subscription deleted event
 * 
 * Downgrades business to free tier when subscription is cancelled
 * 
 * @param {object} subscription - Stripe subscription object
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const businessId = subscription.metadata?.businessId;
    
    if (!businessId) {
      console.log('Subscription deleted without businessId in metadata');
      return;
    }

    const business = await Business.findById(businessId);
    
    if (!business) {
      console.log(`Business not found for subscription: ${subscription.id}`);
      return;
    }

    // Downgrade to free tier
    business.membershipTier = 'free';
    business.subscriptionStatus = 'cancelled';
    business.stripeSubscriptionId = null;
    business.subscriptionExpiry = null;
    
    await business.save();
    
    console.log(`Subscription deleted for business: ${businessId}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

/**
 * Handle invoice payment succeeded event
 * 
 * Creates transaction record for successful subscription payment
 * 
 * @param {object} invoice - Stripe invoice object
 */
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    const customerId = invoice.customer;
    const business = await Business.findOne({ stripeCustomerId: customerId });

    if (!business) {
      console.log(`Business not found for customer: ${customerId}`);
      return;
    }

    // Calculate amounts (invoice.amount_paid is in cents)
    const grossAmount = invoice.amount_paid / 100;
    const stripeFee = calculateStripeFee(grossAmount);
    const netAmount = grossAmount - stripeFee;

    // Create transaction record
    await Transaction.create({
      type: 'subscription_payment',
      grossAmount,
      stripeFee,
      netAmount,
      platformShare: netAmount, // Platform keeps all subscription revenue
      creatorShare: 0,
      status: 'completed',
      stripePaymentIntentId: invoice.payment_intent,
      stripeChargeId: invoice.charge,
      payer: business._id,
      description: 'Subscription payment',
      completedAt: new Date()
    });

    // Update subscription expiry
    if (invoice.period_end) {
      business.subscriptionExpiry = new Date(invoice.period_end * 1000);
      await business.save();
    }

    console.log(`Invoice payment succeeded for business: ${business._id}`);
  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error);
    throw error;
  }
}

/**
 * Handle invoice payment failed event
 * 
 * Updates subscription status when payment fails
 * 
 * @param {object} invoice - Stripe invoice object
 */
async function handleInvoicePaymentFailed(invoice) {
  try {
    const customerId = invoice.customer;
    const business = await Business.findOne({ stripeCustomerId: customerId });

    if (!business) {
      console.log(`Business not found for customer: ${customerId}`);
      return;
    }

    // Update subscription status to past_due
    business.subscriptionStatus = 'past_due';
    await business.save();

    // Create failed transaction record
    const grossAmount = invoice.amount_due / 100;
    const stripeFee = calculateStripeFee(grossAmount);
    const netAmount = grossAmount - stripeFee;

    await Transaction.create({
      type: 'subscription_payment',
      grossAmount,
      stripeFee,
      netAmount,
      platformShare: netAmount,
      creatorShare: 0,
      status: 'failed',
      stripePaymentIntentId: invoice.payment_intent,
      payer: business._id,
      description: 'Subscription payment failed',
      failedAt: new Date()
    });

    console.log(`Invoice payment failed for business: ${business._id}`);
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
    throw error;
  }
}

/**
 * Handle payment intent succeeded event
 * 
 * Updates license payment transactions when payment succeeds
 * 
 * @param {object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    const licenseId = paymentIntent.metadata?.licenseId;
    
    if (!licenseId) {
      // Not a license payment, skip
      return;
    }

    const license = await License.findById(licenseId);
    
    if (!license) {
      console.log(`License not found: ${licenseId}`);
      return;
    }

    // Find or create transaction for this payment intent
    let transaction = await Transaction.findOne({
      stripePaymentIntentId: paymentIntent.id
    });

    if (transaction) {
      // Update existing transaction
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await transaction.save();
    } else {
      // Create new transaction if it doesn't exist
      const grossAmount = paymentIntent.amount / 100;
      const stripeFee = calculateStripeFee(grossAmount);
      const netAmount = grossAmount - stripeFee;

      // Get licensor to calculate revenue split
      const licensor = await Business.findById(license.licensorId);
      const tierConfig = require('../config/tiers').TIER_CONFIG[licensor?.membershipTier || 'free'];
      
      const { calculateRevenueSplit } = require('../utils/revenueCalculation');
      const revenueSplit = calculateRevenueSplit(grossAmount, tierConfig);

      transaction = await Transaction.create({
        type: 'license_payment',
        grossAmount,
        stripeFee,
        netAmount,
        creatorShare: revenueSplit.creatorShare,
        platformShare: revenueSplit.platformShare,
        status: 'completed',
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId: paymentIntent.latest_charge,
        payer: license.licenseeId,
        payee: license.licensorId,
        relatedLicense: license._id,
        description: `License payment for ${license.licenseType} license`,
        completedAt: new Date(),
        metadata: {
          licenseType: license.licenseType,
          tier: licensor?.membershipTier || 'free'
        }
      });
    }

    // Update license status
    if (license.status === 'pending') {
      license.status = 'approved';
      license.paymentTransactionId = transaction._id;
      await license.save();
    }

    console.log(`Payment intent succeeded for license: ${licenseId}`);
  } catch (error) {
    console.error('Error handling payment intent succeeded:', error);
    throw error;
  }
}

/**
 * Handle payment intent failed event
 * 
 * Updates transaction status when payment fails
 * 
 * @param {object} paymentIntent - Stripe payment intent object
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    const licenseId = paymentIntent.metadata?.licenseId;
    
    if (!licenseId) {
      return;
    }

    // Find transaction for this payment intent
    const transaction = await Transaction.findOne({
      stripePaymentIntentId: paymentIntent.id
    });

    if (transaction) {
      transaction.status = 'failed';
      transaction.failedAt = new Date();
      await transaction.save();
    }

    // Update license status if needed
    const license = await License.findById(licenseId);
    if (license && license.status === 'pending') {
      license.status = 'payment_failed';
      await license.save();
    }

    console.log(`Payment intent failed for license: ${licenseId}`);
  } catch (error) {
    console.error('Error handling payment intent failed:', error);
    throw error;
  }
}

/**
 * Handle Connect account updated event
 * 
 * Updates business Connect account status when account details change
 * 
 * @param {object} account - Stripe Connect account object
 */
async function handleAccountUpdated(account) {
  try {
    const businessId = account.metadata?.businessId;
    
    if (!businessId) {
      console.log('Account updated without businessId in metadata');
      return;
    }

    const business = await Business.findById(businessId);
    
    if (!business) {
      console.log(`Business not found for account: ${account.id}`);
      return;
    }

    // Update Connect account status
    if (account.details_submitted && account.charges_enabled) {
      business.stripeConnectStatus = 'active';
    } else if (account.details_submitted) {
      business.stripeConnectStatus = 'pending';
    } else {
      business.stripeConnectStatus = 'pending';
    }

    await business.save();
    
    console.log(`Account updated for business: ${businessId}`);
  } catch (error) {
    console.error('Error handling account updated:', error);
    throw error;
  }
}

/**
 * Handle chargeback dispute created event
 * 
 * Creates dispute transaction and updates related transaction status
 * 
 * @param {object} dispute - Stripe dispute object
 */
async function handleDisputeCreated(dispute) {
  try {
    const chargeId = dispute.charge;
    
    // Find transaction by charge ID
    const transaction = await Transaction.findOne({
      stripeChargeId: chargeId
    });

    if (!transaction) {
      console.log(`Transaction not found for charge: ${chargeId}`);
      return;
    }

    // Update transaction status to disputed
    transaction.status = 'disputed';
    transaction.disputedAt = new Date();
    await transaction.save();

    // Create dispute transaction record
    await Transaction.create({
      type: 'chargeback',
      grossAmount: dispute.amount / 100,
      stripeFee: 0, // Disputes have separate fees
      netAmount: dispute.amount / 100,
      creatorShare: 0,
      platformShare: dispute.amount / 100,
      status: 'completed',
      stripeChargeId: chargeId,
      payer: transaction.payer,
      payee: transaction.payee,
      relatedLicense: transaction.relatedLicense,
      description: `Chargeback dispute for ${transaction.type}`,
      completedAt: new Date(),
      metadata: {
        disputeId: dispute.id,
        reason: dispute.reason,
        originalTransactionId: transaction._id.toString()
      }
    });

    // Update business balances if needed
    if (transaction.payee) {
      const payee = await Business.findById(transaction.payee);
      if (payee) {
        payee.revenueBalance = (payee.revenueBalance || 0) - transaction.creatorShare;
        await payee.save();
      }
    }

    console.log(`Dispute created for transaction: ${transaction._id}`);
  } catch (error) {
    console.error('Error handling dispute created:', error);
    throw error;
  }
}

