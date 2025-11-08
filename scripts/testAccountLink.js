/**
 * Test Stripe Account Link Creation Script
 * 
 * This script tests the createAccountLink method.
 * 
 * Usage:
 *   node scripts/testAccountLink.js [account_id]
 */

require('dotenv').config();
const StripeService = require('../src/services/stripeService');

async function testAccountLink(accountId) {
  console.log('🧪 Testing Stripe Account Link Creation\n');
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
    
    const testBusinessId = 'test_business_' + Date.now();
    
    console.log('📋 Test Data:');
    console.log(`   Account ID: ${accountId}`);
    console.log(`   Business ID: ${testBusinessId}`);
    console.log(`   FRONTEND_URL: ${process.env.FRONTEND_URL || 'NOT SET'}\n`);
    
    // Test 1: Create account link (default)
    console.log('Test 1: Creating account link (default)...');
    try {
      const accountLink = await stripeService.createAccountLink(accountId, testBusinessId);
      console.log('✅ Account link created:');
      console.log(`   URL: ${accountLink.url}`);
      console.log(`   Expires At: ${accountLink.expires_at ? new Date(accountLink.expires_at * 1000).toISOString() : 'N/A'}`);
      console.log(`   Created: ${accountLink.created ? new Date(accountLink.created * 1000).toISOString() : 'N/A'}\n`);
      
      // Test 2: Create account link with custom options
      console.log('Test 2: Creating account link with custom options...');
      const accountLink2 = await stripeService.createAccountLink(
        accountId,
        testBusinessId,
        {
          type: 'account_onboarding',
          refresh_url: `${process.env.FRONTEND_URL}/custom/refresh`,
          return_url: `${process.env.FRONTEND_URL}/custom/return`
        }
      );
      console.log('✅ Account link created with custom options:');
      console.log(`   URL: ${accountLink2.url}`);
      console.log(`   Expires At: ${accountLink2.expires_at ? new Date(accountLink2.expires_at * 1000).toISOString() : 'N/A'}\n`);
      
      console.log('✅ All tests completed successfully!');
      
    } catch (error) {
      console.error('❌ Failed to create account link:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}`);
      
      if (error.message.includes('FRONTEND_URL')) {
        console.error('\n⚠️  FRONTEND_URL is required in .env file.');
        console.error('   Add: FRONTEND_URL=http://localhost:3000\n');
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
  const accountId = process.argv[2];
  testAccountLink(accountId)
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testAccountLink };
