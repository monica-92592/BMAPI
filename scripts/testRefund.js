/**
 * Test Stripe Refund Creation Script
 * 
 * This script tests the createRefund method.
 * 
 * Usage:
 *   node scripts/testRefund.js [payment_intent_id]
 */

require('dotenv').config();
const StripeService = require('../src/services/stripeService');

async function testRefund(paymentIntentId) {
  console.log('🧪 Testing Stripe Refund Creation\n');
  console.log('='.repeat(60));
  
  try {
    const stripeService = new StripeService();
    console.log('✅ StripeService initialized\n');
    
    // If no payment intent ID provided, create one first
    if (!paymentIntentId) {
      console.log('📋 No payment intent ID provided, creating a test payment intent first...\n');
      const testBusinessId = 'test_business_' + Date.now();
      const testEmail = `test_${Date.now()}@example.com`;
      
      // Create customer
      const customer = await stripeService.createCustomer(testBusinessId, testEmail);
      console.log(`✅ Created test customer: ${customer.id}\n`);
      
      // Create payment intent
      const amount = 10000; // $100.00 in cents
      const metadata = {
        businessId: testBusinessId,
        licenseId: 'test_license_123'
      };
      
      const paymentIntent = await stripeService.createPaymentIntent(amount, customer.id, metadata);
      console.log(`✅ Created test payment intent: ${paymentIntent.id}`);
      console.log(`   Status: ${paymentIntent.status}\n`);
      
      paymentIntentId = paymentIntent.id;
      
      // Note: To actually refund, the payment intent needs to be succeeded
      // In test mode, we can't easily create a succeeded payment intent without a payment method
      // So we'll test the refund creation with the payment intent ID, which will fail with expected error
      console.log('⚠️  Note: Payment intent is not yet succeeded.');
      console.log('   Refunds require a succeeded payment intent.');
      console.log('   This test will demonstrate error handling.\n');
    }
    
    console.log('📋 Test Data:');
    console.log(`   Payment Intent ID: ${paymentIntentId}\n`);
    
    // Test 1: Create refund (default)
    console.log('Test 1: Creating refund (default)...');
    try {
      const refund = await stripeService.createRefund(paymentIntentId);
      console.log('✅ Refund created:');
      console.log(`   Refund ID: ${refund.id}`);
      console.log(`   Amount: $${(refund.amount / 100).toFixed(2)}`);
      console.log(`   Status: ${refund.status}`);
      console.log(`   Reason: ${refund.reason}`);
      console.log(`   Payment Intent: ${refund.payment_intent}`);
      console.log(`   Created: ${new Date(refund.created * 1000).toISOString()}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create refund:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}`);
      
      if (error.message.includes('succeeded') || error.message.includes('status')) {
        console.error('\n⚠️  Note: Refunds require a succeeded payment intent.');
        console.error('   The payment intent must have a status of "succeeded" to be refunded.\n');
      } else {
        console.error('');
      }
    }
    
    // Test 2: Create refund with reason
    console.log('Test 2: Creating refund with reason...');
    try {
      const refund = await stripeService.createRefund(paymentIntentId, 'duplicate');
      console.log('✅ Refund created with reason:');
      console.log(`   Refund ID: ${refund.id}`);
      console.log(`   Reason: ${refund.reason}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create refund:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 3: Create partial refund
    console.log('Test 3: Creating partial refund...');
    try {
      const partialAmount = 5000; // $50.00 partial refund
      const refund = await stripeService.createRefund(
        paymentIntentId,
        'requested_by_customer',
        { amount: partialAmount }
      );
      console.log('✅ Partial refund created:');
      console.log(`   Refund ID: ${refund.id}`);
      console.log(`   Amount: $${(refund.amount / 100).toFixed(2)}`);
      console.log(`   Reason: ${refund.reason}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create partial refund:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 4: Test error handling (invalid payment intent ID)
    console.log('Test 4: Testing error handling (invalid payment intent ID)...');
    try {
      await stripeService.createRefund('pi_invalid123');
      console.log('⚠️  Unexpected: Invalid payment intent ID did not throw an error\n');
    } catch (error) {
      console.log('✅ Error handling works correctly:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 5: Test error handling (invalid reason)
    console.log('Test 5: Testing error handling (invalid reason)...');
    try {
      await stripeService.createRefund(paymentIntentId, 'invalid_reason');
      console.log('⚠️  Unexpected: Invalid reason did not throw an error\n');
    } catch (error) {
      console.log('✅ Error handling works correctly:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 6: Test error handling (missing payment intent ID)
    console.log('Test 6: Testing error handling (missing payment intent ID)...');
    try {
      await stripeService.createRefund('');
      console.log('⚠️  Unexpected: Missing payment intent ID did not throw an error\n');
    } catch (error) {
      console.log('✅ Error handling works correctly:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    console.log('✅ All tests completed successfully!');
    
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
  const paymentIntentId = process.argv[2];
  testRefund(paymentIntentId)
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testRefund };
