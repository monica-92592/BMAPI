/**
 * Business Financial Routes
 * 
 * Financial endpoints for businesses to view:
 * - Financial overview (earnings, spending, reserves)
 * - Transaction history with pagination
 * - Revenue breakdown by period
 * - Current balance and available payout
 * - Pool earnings breakdown
 * 
 * All endpoints require authentication and return data for the authenticated business.
 * 
 * @module routes/businessFinancialRoutes
 */

const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Business = require('../models/Business');
const License = require('../models/License');
const { calculateChargebackReserve } = require('../utils/revenueCalculation');
// Note: authenticate middleware is applied in app.js when mounting routes

// ============================================
// Financial Overview Endpoint
// ============================================

/**
 * GET /api/business/financial/overview
 * Get financial overview for authenticated business
 * 
 * Returns:
 * - Total earnings and spending
 * - Pending payouts
 * - Chargeback reserves
 * - Active licenses count
 * - Monthly revenue trend (last 12 months)
 */
router.get('/overview', async (req, res) => {
  try {
    const businessId = req.business._id;

    // Get revenue summary using Transaction model method
    const revenueSummary = await Transaction.getRevenueSummary(businessId);

    // Query pending payouts
    const pendingPayouts = await Transaction.find({
      payee: businessId,
      type: 'payout',
      status: 'pending'
    });

    const pendingPayoutTotal = pendingPayouts.reduce(
      (sum, payout) => sum + payout.netAmount,
      0
    );

    // Calculate chargeback reserve from unreleased transactions
    const unreleasedTransactions = await Transaction.find({
      payee: businessId,
      status: 'completed',
      type: 'license_payment',
      'metadata.reserveReleased': { $ne: true },
      'metadata.reserveReleaseDate': { $gt: new Date() }
    });

    let totalReserve = 0;
    unreleasedTransactions.forEach(transaction => {
      if (transaction.creatorShare > 0) {
        const reserve = calculateChargebackReserve(transaction.creatorShare);
        totalReserve += reserve.reserveAmount;
      }
    });

    // Get active licenses count from Business model
    const business = await Business.findById(businessId);
    const activeLicensesCount = business?.activeLicenseCount || 0;

    // Aggregate monthly revenue for last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyRevenue = await Transaction.aggregate([
      {
        $match: {
          payee: businessId,
          status: 'completed',
          type: 'license_payment',
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$creatorShare' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Format monthly revenue
    const monthlyRevenueTrend = monthlyRevenue.map(item => ({
      year: item._id.year,
      month: item._id.month,
      revenue: item.revenue,
      transactionCount: item.count
    }));

    // Return financial overview
    res.json({
      success: true,
      data: {
        earnings: {
          total: revenueSummary.totalEarnings,
          transactionCount: revenueSummary.earningsCount
        },
        spending: {
          total: revenueSummary.totalSpent,
          transactionCount: revenueSummary.spentCount
        },
        pendingPayouts: {
          total: pendingPayoutTotal,
          count: pendingPayouts.length
        },
        chargebackReserve: {
          total: totalReserve,
          transactionCount: unreleasedTransactions.length
        },
        activeLicenses: activeLicensesCount,
        monthlyRevenueTrend
      }
    });
  } catch (error) {
    console.error('Error fetching financial overview:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch financial overview'
    });
  }
});

// ============================================
// Transaction History Endpoint
// ============================================

/**
 * GET /api/business/financial/transactions
 * Get transaction history for authenticated business
 * 
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - type: Filter by transaction type
 * - status: Filter by transaction status
 * 
 * Returns paginated transactions with related data populated
 */
router.get('/transactions', async (req, res) => {
  try {
    const businessId = req.business._id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Build query where business is payer OR payee
    const query = {
      $or: [
        { payer: businessId },
        { payee: businessId }
      ]
    };

    // Apply filters if provided
    if (req.query.type) {
      query.type = req.query.type;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(query);

    // Get paginated transactions with populated related data
    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('relatedLicense', 'licenseType price status')
      .populate('payer', 'companyName email')
      .populate('payee', 'companyName email');

    // Return transactions with pagination info
    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch transactions'
    });
  }
});

// ============================================
// Revenue Breakdown Endpoint
// ============================================

/**
 * GET /api/business/financial/revenue
 * Get revenue breakdown by period
 * 
 * Query parameters:
 * - period: 7days, 30days, 12months, all (default: 30days)
 * 
 * Returns:
 * - Revenue by transaction type
 * - Daily revenue trend
 */
router.get('/revenue', async (req, res) => {
  try {
    const businessId = req.business._id;
    const period = req.query.period || '30days';

    // Calculate start date based on period
    const startDate = new Date();
    switch (period) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '12months':
        startDate.setMonth(startDate.getMonth() - 12);
        break;
      case 'all':
        startDate.setFullYear(2000); // Very old date to get all
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Aggregate revenue by transaction type
    const revenueByType = await Transaction.aggregate([
      {
        $match: {
          payee: businessId,
          status: 'completed',
          type: { $in: ['license_payment', 'platform_fee'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$creatorShare' },
          count: { $sum: 1 },
          average: { $avg: '$creatorShare' }
        }
      }
    ]);

    // Aggregate daily revenue trend
    const dailyRevenue = await Transaction.aggregate([
      {
        $match: {
          payee: businessId,
          status: 'completed',
          type: { $in: ['license_payment', 'platform_fee'] },
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          revenue: { $sum: '$creatorShare' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);

    // Format daily revenue
    const dailyRevenueTrend = dailyRevenue.map(item => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      revenue: item.revenue,
      transactionCount: item.count
    }));

    // Format revenue by type
    const revenueBreakdown = revenueByType.map(item => ({
      type: item._id,
      total: item.total,
      count: item.count,
      average: item.average
    }));

    // Calculate totals
    const totalRevenue = revenueBreakdown.reduce((sum, item) => sum + item.total, 0);
    const totalTransactions = revenueBreakdown.reduce((sum, item) => sum + item.count, 0);

    // Return revenue breakdown
    res.json({
      success: true,
      data: {
        period,
        startDate: startDate.toISOString(),
        summary: {
          totalRevenue,
          totalTransactions
        },
        revenueByType: revenueBreakdown,
        dailyRevenueTrend
      }
    });
  } catch (error) {
    console.error('Error fetching revenue breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch revenue breakdown'
    });
  }
});

// ============================================
// Balance Endpoint
// ============================================

/**
 * GET /api/business/financial/balance
 * Get current balance and available payout
 * 
 * Returns:
 * - Current balance from Business model
 * - Chargeback reserve
 * - Pending payouts
 * - Available for payout (balance - $25 minimum)
 */
router.get('/balance', async (req, res) => {
  try {
    const businessId = req.business._id;

    // Get current balance from Business model
    const business = await Business.findById(businessId);
    const currentBalance = business?.revenueBalance || 0;

    // Calculate chargeback reserve
    const unreleasedTransactions = await Transaction.find({
      payee: businessId,
      status: 'completed',
      type: 'license_payment',
      'metadata.reserveReleased': { $ne: true },
      'metadata.reserveReleaseDate': { $gt: new Date() }
    });

    let totalReserve = 0;
    unreleasedTransactions.forEach(transaction => {
      if (transaction.creatorShare > 0) {
        const reserve = calculateChargebackReserve(transaction.creatorShare);
        totalReserve += reserve.reserveAmount;
      }
    });

    // Get pending payouts
    const pendingPayouts = await Transaction.find({
      payee: businessId,
      type: 'payout',
      status: 'pending'
    });

    const pendingPayoutTotal = pendingPayouts.reduce(
      (sum, payout) => sum + payout.netAmount,
      0
    );

    // Calculate available for payout (balance - $25 minimum)
    const minimumPayout = 25.00;
    const availableForPayout = Math.max(0, currentBalance - minimumPayout);

    // Return balance breakdown
    res.json({
      success: true,
      data: {
        currentBalance,
        chargebackReserve: totalReserve,
        pendingPayouts: {
          total: pendingPayoutTotal,
          count: pendingPayouts.length
        },
        availableForPayout,
        minimumPayout,
        balanceStatus: business?.balanceStatus || 'positive'
      }
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch balance'
    });
  }
});

// ============================================
// Pool Earnings Endpoint
// ============================================

/**
 * GET /api/business/financial/pool-earnings
 * Get pool earnings breakdown
 * 
 * Returns:
 * - Earnings grouped by collection/pool
 * - Total per pool
 * - Member contribution breakdown
 */
router.get('/pool-earnings', async (req, res) => {
  try {
    const businessId = req.business._id;

    // Query transactions with pool metadata (collectionId in metadata)
    const poolTransactions = await Transaction.find({
      payee: businessId,
      status: 'completed',
      type: 'license_payment',
      'metadata.collectionId': { $exists: true }
    }).populate('relatedLicense', 'licenseType price status');

    // Group by collectionId
    const poolEarningsMap = new Map();

    poolTransactions.forEach(transaction => {
      const collectionId = transaction.metadata.collectionId;
      const contributionPercent = transaction.metadata.contributionPercent || 0;
      const memberShare = transaction.creatorShare || 0;

      if (!poolEarningsMap.has(collectionId)) {
        poolEarningsMap.set(collectionId, {
          collectionId,
          totalEarnings: 0,
          transactionCount: 0,
          memberShare: 0,
          contributionPercent: 0
        });
      }

      const poolEarnings = poolEarningsMap.get(collectionId);
      poolEarnings.totalEarnings += transaction.grossAmount;
      poolEarnings.transactionCount += 1;
      poolEarnings.memberShare += memberShare;
      poolEarnings.contributionPercent = contributionPercent; // Should be same for all transactions in pool
    });

    // Convert map to array
    const poolEarnings = Array.from(poolEarningsMap.values()).map(pool => ({
      collectionId: pool.collectionId,
      totalPoolRevenue: pool.totalEarnings,
      transactionCount: pool.transactionCount,
      memberEarnings: pool.memberShare,
      contributionPercent: pool.contributionPercent
    }));

    // Calculate totals
    const totalPoolEarnings = poolEarnings.reduce((sum, pool) => sum + pool.memberEarnings, 0);
    const totalPoolTransactions = poolEarnings.reduce((sum, pool) => sum + pool.transactionCount, 0);

    // Return pool earnings breakdown
    res.json({
      success: true,
      data: {
        summary: {
          totalPoolEarnings,
          totalPoolTransactions,
          poolCount: poolEarnings.length
        },
        pools: poolEarnings
      }
    });
  } catch (error) {
    console.error('Error fetching pool earnings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch pool earnings'
    });
  }
});

module.exports = router;

