/**
 * Stripe Configuration
 * 
 * This file will contain the Stripe SDK initialization and configuration.
 * 
 * TODO: Initialize Stripe when account is configured
 * 
 * When ready to implement:
 * 1. Install Stripe SDK: npm install stripe
 * 2. Add STRIPE_SECRET_KEY to environment variables
 * 3. Uncomment the Stripe initialization code below
 * 4. Update exports to return the Stripe instance
 * 
 * @module config/stripe
 */

const Stripe = require('stripe');

// Initialize Stripe with secret key from environment variables
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  STRIPE_SECRET_KEY not found in environment variables. Stripe functionality will be disabled.');
  module.exports = null;
} else {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-11-20.acacia', // Use latest API version
    typescript: false
  });

  console.log('✅ Stripe initialized successfully');
  
  // Export Stripe instance
  module.exports = stripe;
}

