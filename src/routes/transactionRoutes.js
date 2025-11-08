const express = require('express');
const router = express.Router();
// TODO: Import transaction controller functions
// const {
//   getTransactionHistory,
//   getTransactionById,
//   getRevenueBalance,
//   withdrawFunds,
//   getRevenueSplit,
//   getFinancialStats
// } = require('../controllers/transactionController');
const { processRefund } = require('../controllers/transactionController');

// All routes require authentication (applied in app.js)

// GET /api/transactions - Get transaction history
// router.get('/', getTransactionHistory);

// GET /api/transactions/:id - Get transaction details
// router.get('/:id', getTransactionById);

// GET /api/transactions/balance - Get revenue balance
// router.get('/balance', getRevenueBalance);

// POST /api/transactions/withdraw - Withdraw funds
// router.post('/withdraw', withdrawFunds);

// GET /api/transactions/revenue-split - Get revenue split info
// router.get('/revenue-split', getRevenueSplit);

// GET /api/transactions/stats - Get financial statistics
// router.get('/stats', getFinancialStats);

// ============================================
// Transaction Refund Routes
// ============================================

/**
 * POST /api/transactions/:id/refund
 * Process refund for a transaction
 * Middleware: authenticate (app.js)
 * Body: { reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' }
 */
router.post('/:id/refund', processRefund);

module.exports = router;

