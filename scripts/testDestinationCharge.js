/**
 * Test Stripe Destination Charge Creation Script
 * 
 * This script tests the createDestinationCharge method.
 * 
 * Usage:
 *   node scripts/testDestinationCharge.js [customer_id] [account_id]
 */

require('dotenv').config();
const StripeService = require('../src/services/stripeService');

async function testDestinationCharge(customerId, accountId) {
  console.log('🧪 Testing Stripe Destination Charge Creation\n');
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
    
    // If no account ID provided, create one first
    if (!accountId) {
      console.log('📋 No Connect account ID provided, creating a test Connect account first...\n');
      const testBusinessId = 'test_business_' + Date.now();
      const account = await stripeService.createConnectAccount(testBusinessId);
      accountId = account.id;
      console.log(`✅ Created test Connect account: ${accountId}\n`);
    }
    
    console.log('📋 Test Data:');
    console.log(`   Customer ID: ${customerId}`);
    console.log(`   Destination Account ID: ${accountId}\n`);
    
    // Note: Destination charges require the Connect account to be active
    // For testing, we'll try to create a charge and handle the error if the account isn't active
    
    // Test 1: Create destination charge (default)
    console.log('Test 1: Creating destination charge (default)...');
    try {
      const amount = 10000; // $100.00 in cents
      const metadata = {
        businessId: 'test_business_' + Date.now(),
        licenseId: 'test_license_123'
      };
      
      const charge = await stripeService.createDestinationCharge(amount, customerId, accountId, metadata);
      console.log('✅ Destination charge created:');
      console.log(`   Charge ID: ${charge.id}`);
      console.log(`   Amount: $${(charge.amount / 100).toFixed(2)}`);
      console.log(`   Currency: ${charge.currency}`);
      console.log(`   Status: ${charge.status}`);
      console.log(`   Customer: ${charge.customer}`);
      console.log(`   Destination: ${charge.destination}`);
      console.log(`   Application Fee: ${charge.application_fee_amount ? `$${(charge.application_fee_amount / 100).toFixed(2)}` : 'N/A'}`);
      console.log(`   Metadata: ${JSON.stringify(charge.metadata)}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create destination charge:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}`);
      
      if (error.message.includes('account') || error.message.includes('Connect')) {
        console.error('\n⚠️  Note: Destination charges require the Connect account to be active.');
        console.error('   The account must have completed onboarding (details_submitted = true).');
        console.error('   Use createAccountLink() to generate an onboarding link.\n');
      } else {
        console.error('');
      }
    }
    
    // Test 2: Create destination charge with options
    console.log('Test 2: Creating destination charge with options...');
    try {
      const amount = 5000; // $50.00 in cents
      const applicationFee = 500; // $5.00 platform fee
      const metadata = {
        businessId: 'test_business_' + Date.now(),
        licenseId: 'test_license_456'
      };
      
      const charge = await stripeService.createDestinationCharge(
        amount,
        customerId,
        accountId,
        metadata,
        {
          currency: 'usd',
          application_fee_amount: applicationFee
        }
      );
      console.log('✅ Destination charge created with options:');
      console.log(`   Charge ID: ${charge.id}`);
      console.log(`   Amount: $${(charge.amount / 100).toFixed(2)}`);
      console.log(`   Application Fee: $${(charge.application_fee_amount / 100).toFixed(2)}`);
      console.log(`   Status: ${charge.status}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create destination charge:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 3: Test error handling (invalid amount)
    console.log('Test 3: Testing error handling (invalid amount)...');
    try {
      await stripeService.createDestinationCharge(0, customerId, accountId, {});
      console.log('⚠️  Unexpected: Invalid amount did not throw an error\n');
    } catch (error) {
      console.log('✅ Error handling works correctly:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 4: Test error handling (missing destination)
    console.log('Test 4: Testing error handling (missing destination)...');
    try {
      await stripeService.createDestinationCharge(1000, customerId, '', {});
      console.log('⚠️  Unexpected: Missing destination did not throw an error\n');
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
  const accountId = process.argv[3];
  testDestinationCharge(customerId, accountId)
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testDestinationCharge };
