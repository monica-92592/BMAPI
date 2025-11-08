/**
 * Test Stripe Connect Account Creation Script
 * 
 * This script tests the createConnectAccount method.
 * 
 * Usage:
 *   node scripts/testConnectAccount.js
 */

require('dotenv').config();
const StripeService = require('../src/services/stripeService');

async function testConnectAccount() {
  console.log('🧪 Testing Stripe Connect Account Creation\n');
  console.log('='.repeat(60));
  
  try {
    const stripeService = new StripeService();
    console.log('✅ StripeService initialized\n');
    
    // Test data
    const testBusinessId = 'test_business_' + Date.now();
    const testEmail = `test_${Date.now()}@example.com`;
    
    console.log('📋 Test Data:');
    console.log(`   Business ID: ${testBusinessId}`);
    console.log(`   Email: ${testEmail}\n`);
    
    // Test 1: Create Express account (default)
    console.log('Test 1: Creating Express Connect account (default)...');
    try {
      const account = await stripeService.createConnectAccount(testBusinessId);
      console.log('✅ Connect account created:');
      console.log(`   Account ID: ${account.id}`);
      console.log(`   Type: ${account.type}`);
      console.log(`   Country: ${account.country || 'N/A'}`);
      console.log(`   Charges Enabled: ${account.charges_enabled}`);
      console.log(`   Payouts Enabled: ${account.payouts_enabled}`);
      console.log(`   Details Submitted: ${account.details_submitted}`);
      console.log(`   Metadata: ${JSON.stringify(account.metadata)}\n`);
      
      // Test 2: Create Express account with options
      console.log('Test 2: Creating Express Connect account with options...');
      const account2 = await stripeService.createConnectAccount(
        'test_business_' + Date.now(),
        {
          type: 'express',
          country: 'US',
          email: testEmail
        }
      );
      console.log('✅ Connect account created with options:');
      console.log(`   Account ID: ${account2.id}`);
      console.log(`   Type: ${account2.type}`);
      console.log(`   Country: ${account2.country}`);
      console.log(`   Email: ${account2.email || 'N/A'}\n`);
      
      console.log('✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('❌ Failed to create Connect account:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}`);
      
      if (error.message.includes('Connect') || error.message.includes('not enabled')) {
        console.error('\n⚠️  Stripe Connect may not be enabled in your Stripe Dashboard.');
        console.error('   To enable Stripe Connect:');
        console.error('   1. Go to Stripe Dashboard → Settings → Connect');
        console.error('   2. Enable Stripe Connect');
        console.error('   3. Configure your Connect settings\n');
      }
    }
    
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
  testConnectAccount()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testConnectAccount };
