const Business = require('../models/Business');
const jwt = require('jsonwebtoken');

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Register new business
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name, companyName, companyType, industry } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email, password, and name are required'
      });
    }

    // Check if business already exists
    const existingBusiness = await Business.findOne({ email });
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        error: 'Business exists',
        message: 'Business with this email already exists'
      });
    }

    // Create business with default values
    const businessData = {
      email,
      password,
      name,
      companyName: companyName || name, // Use name as companyName if not provided
      companyType: companyType || 'other',
      industry: industry || 'general',
      membershipTier: 'free',
      subscriptionStatus: 'active',
      // Initialize resource limits
      uploadCount: 0,
      downloadCount: 0,
      activeLicenseCount: 0,
      // Initialize financial fields
      revenueBalance: 0,
      totalEarnings: 0,
      totalSpent: 0,
      // Initialize arrays
      transactionHistory: [],
      proposalsCreated: [],
      votesCast: [],
      mediaPortfolio: [],
      licensesAsLicensor: [],
      licensesAsLicensee: [],
      collectionsOwned: [],
      collectionsMemberOf: []
    };

    const business = await Business.create(businessData);

    // Set limit reset timestamps
    business.lastUploadReset = business.createdAt;
    business.lastDownloadReset = business.createdAt;
    await business.save();

    // Generate token
    const token = generateToken(business._id);

    res.status(201).json({
      success: true,
      data: {
        business: business.toJSON(),
        user: business.toJSON(), // For backward compatibility
        token
      },
      message: 'Business registered successfully'
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Login business
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Email and password are required'
      });
    }

    // Find business
    const business = await Business.findOne({ email });
    if (!business) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await business.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(business._id);

    res.json({
      success: true,
      data: {
        business: business.toJSON(),
        user: business.toJSON(), // For backward compatibility
        token
      },
      message: 'Login successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current business
 */
const getMe = async (req, res, next) => {
  try {
    const business = await Business.findById(req.business._id || req.user._id).select('-password');
    res.json({
      success: true,
      data: {
        business: business,
        user: business // For backward compatibility
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};

