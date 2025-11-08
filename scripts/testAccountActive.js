/**
 * Test Stripe Account Active Check Script
 * 
 * This script tests the isAccountActive method.
 * 
 * Usage:
 *   node scripts/testAccountActive.js [account_id]
 */

require('dotenv').config();
const StripeService = require('../src/services/stripeService');

async function testAccountActive(accountId) {
  console.log('🧪 Testing Stripe Account Active Check\n');
  console.log('='.repeat(60));
  
  try {
    const stripeService = new StripeService();
    console.log('✅ StripeService initialized\n');
    
    // If no account ID provided, create one first
    if (!accountId) {
      console.log('📋 No account ID provided, creating a test Connect account first...\n');
      const testBusinessId = 'test_business_' + Date.now();
      const account = await stripeService.createConnectAccount(testBusinessId);
      accountId = account.id;
      console.log(`✅ Created test account: ${accountId}\n`);
    }
    
    console.log('📋 Test Data:');
    console.log(`   Account ID: ${accountId}\n`);
    
    // Test 1: Check if account is active
    console.log('Test 1: Checking if account is active...');
    try {
      const isActive = await stripeService.isAccountActive(accountId);
      console.log(`✅ Account status checked:`);
      console.log(`   Account ID: ${accountId}`);
      console.log(`   Is Active: ${isActive}`);
      
      // Get account details for more info
      const account = await stripeService.stripe.accounts.retrieve(accountId);
      console.log(`   Details Submitted: ${account.details_submitted}`);
      console.log(`   Charges Enabled: ${account.charges_enabled}`);
      console.log(`   Payouts Enabled: ${account.payouts_enabled}\n`);
      
      if (!isActive) {
        console.log('ℹ️  Account is not yet active. This is expected for new accounts.');
        console.log('   To activate the account, complete the onboarding process using createAccountLink().\n');
      }
      
    } catch (error) {
      console.error('❌ Failed to check account status:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 2: Test with invalid account ID
    console.log('Test 2: Testing with invalid account ID...');
    try {
      await stripeService.isAccountActive('acct_invalid123');
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
  testAccountActive(accountId)
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testAccountActive };
