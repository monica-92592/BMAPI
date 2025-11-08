const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/errorMiddleware');
const webhookRoutes = require('./routes/webhookRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const authRoutes = require('./routes/authRoutes');
const businessRoutes = require('./routes/businessRoutes');
const businessFinancialRoutes = require('./routes/businessFinancialRoutes');
const licenseRoutes = require('./routes/licenseRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const proposalRoutes = require('./routes/proposalRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const { listLicensableMedia, getMediaLicensingInfo } = require('./controllers/mediaController');
const {
  authenticate,
  optionalAuth,
  requirePartnerTier,
  checkUploadLimit,
  checkDownloadLimit,
  checkActiveLicenseLimit
} = require('./middlewares/auth');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Logging middleware
app.use(morgan('combined'));

// Webhook routes - MUST be before body parser middleware
// Webhooks require raw body for signature verification
app.use('/api/webhooks', webhookRoutes);

// Body parser middleware (after webhooks)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later'
  }
});
app.use('/api/', limiter);

// Public routes
app.use('/api/auth', authRoutes);

// Public media routes (no auth required)
// GET /api/media/licensable - Browse licensable media
app.get('/api/media/licensable', listLicensableMedia);

// GET /api/media/:id/licensing-info - View licensing info
app.get('/api/media/:id/licensing-info', getMediaLicensingInfo);

// Protected routes - require authentication
// Note: checkUploadLimit is applied at route level in mediaRoutes.js for upload endpoints
app.use('/api/media', authenticate, mediaRoutes);
app.use('/api/business', authenticate, businessRoutes);
app.use('/api/business/financial', authenticate, businessFinancialRoutes);
app.use('/api/licenses', authenticate, licenseRoutes);
app.use('/api/subscriptions', authenticate, subscriptionRoutes);
// Collections routes - optional auth for viewing, Partner tier required for management (applied at route level)
app.use('/api/collections', optionalAuth, collectionRoutes);
app.use('/api/proposals', authenticate, proposalRoutes);
app.use('/api/transactions', authenticate, transactionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Media API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;

