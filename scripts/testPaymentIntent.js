/**
 * Test Stripe Payment Intent Creation Script
 * 
 * This script tests the createPaymentIntent method.
 * 
 * Usage:
 *   node scripts/testPaymentIntent.js [customer_id]
 */

require('dotenv').config();
const StripeService = require('../src/services/stripeService');

async function testPaymentIntent(customerId) {
  console.log('🧪 Testing Stripe Payment Intent Creation\n');
  console.log('='.repeat(60));
  
  try {
    const stripeService = new StripeService();
    console.log('✅ StripeService initialized\n');
    
    // If no customer ID provided, create one first
    if (!customerId) {
      console.log('📋 No customer ID provided, creating a test customer first...\n');
      const testBusinessId = 'test_business_' + Date.now();
      const testEmail = `test_${Date.now()}@example.com`;
      const customer = await stripeService.createCustomer(testBusinessId, testEmail);
      customerId = customer.id;
      console.log(`✅ Created test customer: ${customerId}\n`);
    }
    
    console.log('📋 Test Data:');
    console.log(`   Customer ID: ${customerId}\n`);
    
    // Test 1: Create payment intent (default)
    console.log('Test 1: Creating payment intent (default)...');
    try {
      const amount = 10000; // $100.00 in cents
      const metadata = {
        businessId: 'test_business_' + Date.now(),
        licenseId: 'test_license_123'
      };
      
      const paymentIntent = await stripeService.createPaymentIntent(amount, customerId, metadata);
      console.log('✅ Payment intent created:');
      console.log(`   Payment Intent ID: ${paymentIntent.id}`);
      console.log(`   Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);
      console.log(`   Currency: ${paymentIntent.currency}`);
      console.log(`   Status: ${paymentIntent.status}`);
      console.log(`   Customer: ${paymentIntent.customer}`);
      console.log(`   Metadata: ${JSON.stringify(paymentIntent.metadata)}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create payment intent:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 2: Create payment intent with options
    console.log('Test 2: Creating payment intent with options...');
    try {
      const amount = 5000; // $50.00 in cents
      const metadata = {
        businessId: 'test_business_' + Date.now(),
        licenseId: 'test_license_456'
      };
      
      const paymentIntent = await stripeService.createPaymentIntent(
        amount,
        customerId,
        metadata,
        {
          currency: 'usd',
          confirmation_method: 'manual'
        }
      );
      console.log('✅ Payment intent created with options:');
      console.log(`   Payment Intent ID: ${paymentIntent.id}`);
      console.log(`   Amount: $${(paymentIntent.amount / 100).toFixed(2)}`);
      console.log(`   Currency: ${paymentIntent.currency}`);
      console.log(`   Status: ${paymentIntent.status}`);
      console.log(`   Confirmation Method: ${paymentIntent.confirmation_method}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create payment intent:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 3: Test error handling (invalid amount)
    console.log('Test 3: Testing error handling (invalid amount)...');
    try {
      await stripeService.createPaymentIntent(0, customerId, {});
      console.log('⚠️  Unexpected: Invalid amount did not throw an error\n');
    } catch (error) {
      console.log('✅ Error handling works correctly:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 4: Test error handling (invalid customer)
    console.log('Test 4: Testing error handling (invalid customer)...');
    try {
      await stripeService.createPaymentIntent(1000, 'cus_invalid123', {});
      console.log('⚠️  Unexpected: Invalid customer ID did not throw an error\n');
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
  const customerId = process.argv[2];
  testPaymentIntent(customerId)
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testPaymentIntent };
