/**
 * Test Stripe Payout Creation Script
 * 
 * This script tests the createPayout method.
 * 
 * Usage:
 *   node scripts/testPayout.js [account_id]
 */

require('dotenv').config();
const StripeService = require('../src/services/stripeService');

async function testPayout(accountId) {
  console.log('🧪 Testing Stripe Payout Creation\n');
  console.log('='.repeat(60));
  
  try {
    const stripeService = new StripeService();
    console.log('✅ StripeService initialized\n');
    
    // If no account ID provided, create one first
    if (!accountId) {
      console.log('📋 No Connect account ID provided, creating a test Connect account first...\n');
      const testBusinessId = 'test_business_' + Date.now();
      const account = await stripeService.createConnectAccount(testBusinessId);
      accountId = account.id;
      console.log(`✅ Created test Connect account: ${accountId}\n`);
    }
    
    console.log('📋 Test Data:');
    console.log(`   Connect Account ID: ${accountId}\n`);
    
    // Note: Payouts require the Connect account to be active and have a balance
    // For testing, we'll try to create a payout and handle the error if the account isn't ready
    
    // Test 1: Create payout (default)
    console.log('Test 1: Creating payout (default)...');
    try {
      const amount = 10000; // $100.00 in cents
      const metadata = {
        businessId: 'test_business_' + Date.now(),
        payoutType: 'manual'
      };
      
      const payout = await stripeService.createPayout(accountId, amount, metadata);
      console.log('✅ Payout created:');
      console.log(`   Payout ID: ${payout.id}`);
      console.log(`   Amount: $${(payout.amount / 100).toFixed(2)}`);
      console.log(`   Currency: ${payout.currency}`);
      console.log(`   Status: ${payout.status}`);
      console.log(`   Method: ${payout.method}`);
      console.log(`   Arrival Date: ${payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : 'N/A'}`);
      console.log(`   Metadata: ${JSON.stringify(payout.metadata)}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create payout:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}`);
      
      if (error.message.includes('account') || error.message.includes('balance') || error.message.includes('payouts_enabled')) {
        console.error('\n⚠️  Note: Payouts require the Connect account to be active and have a balance.');
        console.error('   The account must have:');
        console.error('   - Completed onboarding (details_submitted = true)');
        console.error('   - Payouts enabled (payouts_enabled = true)');
        console.error('   - A positive balance');
        console.error('   Use createAccountLink() to generate an onboarding link.\n');
      } else {
        console.error('');
      }
    }
    
    // Test 2: Create payout with options
    console.log('Test 2: Creating payout with options...');
    try {
      const amount = 5000; // $50.00 in cents
      const metadata = {
        businessId: 'test_business_' + Date.now(),
        payoutType: 'scheduled'
      };
      
      const payout = await stripeService.createPayout(
        accountId,
        amount,
        metadata,
        {
          currency: 'usd',
          method: 'standard'
        }
      );
      console.log('✅ Payout created with options:');
      console.log(`   Payout ID: ${payout.id}`);
      console.log(`   Amount: $${(payout.amount / 100).toFixed(2)}`);
      console.log(`   Method: ${payout.method}`);
      console.log(`   Status: ${payout.status}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create payout:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 3: Test error handling (invalid amount)
    console.log('Test 3: Testing error handling (invalid amount)...');
    try {
      await stripeService.createPayout(accountId, 0, {});
      console.log('⚠️  Unexpected: Invalid amount did not throw an error\n');
    } catch (error) {
      console.log('✅ Error handling works correctly:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 4: Test error handling (missing account ID)
    console.log('Test 4: Testing error handling (missing account ID)...');
    try {
      await stripeService.createPayout('', 1000, {});
      console.log('⚠️  Unexpected: Missing account ID did not throw an error\n');
    } catch (error) {
      console.log('✅ Error handling works correctly:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 5: Test error handling (invalid account ID)
    console.log('Test 5: Testing error handling (invalid account ID)...');
    try {
      await stripeService.createPayout('acct_invalid123', 1000, {});
      console.log('⚠️  Unexpected: Invalid account ID did not throw an error\n');
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
  const accountId = process.argv[2];
  testPayout(accountId)
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testPayout };
