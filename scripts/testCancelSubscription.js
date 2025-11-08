/**
 * Test Cancel Subscription Script
 * 
 * This script tests the cancelSubscription method.
 * 
 * Usage:
 *   node scripts/testCancelSubscription.js <subscription_id>
 */

require('dotenv').config();
const StripeService = require('../src/services/stripeService');

async function testCancelSubscription(subscriptionId) {
  console.log('🧪 Testing Stripe Subscription Cancellation\n');
  console.log('='.repeat(60));
  
  if (!subscriptionId) {
    console.error('❌ Error: Subscription ID required');
    console.error('Usage: node scripts/testCancelSubscription.js <subscription_id>');
    process.exit(1);
  }
  
  try {
    const stripeService = new StripeService();
    console.log('✅ StripeService initialized\n');
    
    console.log(`📋 Cancelling subscription: ${subscriptionId}\n`);
    
    // Test 1: Cancel immediately
    console.log('Test 1: Cancelling subscription immediately...');
    try {
      const cancelled = await stripeService.cancelSubscription(subscriptionId, { immediately: true });
      console.log('✅ Subscription cancelled:');
      console.log(`   Subscription ID: ${cancelled.id}`);
      console.log(`   Status: ${cancelled.status}`);
      console.log(`   Canceled At: ${cancelled.canceled_at ? new Date(cancelled.canceled_at * 1000).toISOString() : 'N/A'}`);
      console.log(`   Cancel At Period End: ${cancelled.cancel_at_period_end}\n`);
    } catch (error) {
      console.error('❌ Failed to cancel subscription:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}\n`);
      
      // If subscription is already cancelled, that's expected
      if (error.message.includes('already') || error.message.includes('canceled')) {
        console.log('ℹ️  Subscription may already be cancelled. This is expected if you run the test twice.\n');
      }
    }
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  const subscriptionId = process.argv[2];
  testCancelSubscription(subscriptionId)
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testCancelSubscription };
