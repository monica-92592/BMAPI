const StripeService = require('../services/stripeService');
const Transaction = require('../models/Transaction');
const Business = require('../models/Business');

/**
 * Process refund for a transaction
 * POST /api/transactions/:id/refund
 * Middleware: authenticate
 * Body: { reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' }
 */
const processRefund = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const { reason } = req.body;
    
    // Get transaction
    const transaction = await Transaction.findById(transactionId)
      .populate('payer payee');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'transaction_not_found',
        message: 'Transaction not found'
      });
    }
    
    if (transaction.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'invalid_status',
        message: 'Transaction is not completed'
      });
    }
    
    if (!transaction.stripePaymentIntentId) {
      return res.status(400).json({
        success: false,
        error: 'no_payment_intent',
        message: 'Transaction has no payment intent'
      });
    }
    
    const stripeService = new StripeService();
    const refund = await stripeService.createRefund(
      transaction.stripePaymentIntentId,
      reason || 'requested_by_customer'
    );
    
    // Update transaction
    transaction.status = 'refunded';
    transaction.stripeRefundId = refund.id;
    transaction.refundedAt = new Date();
    await transaction.save();
    
    // Adjust business balances
    if (transaction.payer) {
      const payer = await Business.findById(transaction.payer._id);
      payer.revenueBalance = (payer.revenueBalance || 0) + transaction.grossAmount; // Refund full amount
      await payer.save();
    }
    
    if (transaction.payee) {
      const payee = await Business.findById(transaction.payee._id);
      payee.revenueBalance = (payee.revenueBalance || 0) - transaction.creatorShare; // Deduct creator share
      await payee.save();
    }
    
    res.json({
      success: true,
      data: {
        refund: {
          id: refund.id,
          amount: refund.amount / 100
        },
        transaction: {
          id: transaction._id,
          status: transaction.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processRefund
};

