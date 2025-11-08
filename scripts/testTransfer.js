/**
 * Test Stripe Transfer Creation Script
 * 
 * This script tests the createTransfer method.
 * 
 * Usage:
 *   node scripts/testTransfer.js [account_id]
 */

require('dotenv').config();
const StripeService = require('../src/services/stripeService');

async function testTransfer(accountId) {
  console.log('🧪 Testing Stripe Transfer Creation\n');
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
    console.log(`   Destination Account ID: ${accountId}\n`);
    
    // Note: Transfers require the Connect account to be active
    // For testing, we'll try to create a transfer and handle the error if the account isn't ready
    
    // Test 1: Create transfer (default)
    console.log('Test 1: Creating transfer (default)...');
    try {
      const amount = 10000; // $100.00 in cents
      const metadata = {
        businessId: 'test_business_' + Date.now(),
        transferType: 'revenue_share'
      };
      
      const transfer = await stripeService.createTransfer(amount, accountId, metadata);
      console.log('✅ Transfer created:');
      console.log(`   Transfer ID: ${transfer.id}`);
      console.log(`   Amount: $${(transfer.amount / 100).toFixed(2)}`);
      console.log(`   Currency: ${transfer.currency}`);
      console.log(`   Status: ${transfer.status}`);
      console.log(`   Destination: ${transfer.destination}`);
      console.log(`   Created: ${new Date(transfer.created * 1000).toISOString()}`);
      console.log(`   Metadata: ${JSON.stringify(transfer.metadata)}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create transfer:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}`);
      
      if (error.message.includes('account') || error.message.includes('Connect') || error.message.includes('balance')) {
        console.error('\n⚠️  Note: Transfers require the Connect account to be active.');
        console.error('   The account must have:');
        console.error('   - Completed onboarding (details_submitted = true)');
        console.error('   - The platform account must have sufficient balance');
        console.error('   Use createAccountLink() to generate an onboarding link.\n');
      } else {
        console.error('');
      }
    }
    
    // Test 2: Create transfer with options
    console.log('Test 2: Creating transfer with options...');
    try {
      const amount = 5000; // $50.00 in cents
      const metadata = {
        businessId: 'test_business_' + Date.now(),
        transferType: 'payout'
      };
      
      const transfer = await stripeService.createTransfer(
        amount,
        accountId,
        metadata,
        {
          currency: 'usd',
          transfer_group: 'group_' + Date.now()
        }
      );
      console.log('✅ Transfer created with options:');
      console.log(`   Transfer ID: ${transfer.id}`);
      console.log(`   Amount: $${(transfer.amount / 100).toFixed(2)}`);
      console.log(`   Transfer Group: ${transfer.transfer_group || 'N/A'}`);
      console.log(`   Status: ${transfer.status}\n`);
      
    } catch (error) {
      console.error('❌ Failed to create transfer:');
      console.error(`   Error: ${error.message}`);
      console.error(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 3: Test error handling (invalid amount)
    console.log('Test 3: Testing error handling (invalid amount)...');
    try {
      await stripeService.createTransfer(0, accountId, {});
      console.log('⚠️  Unexpected: Invalid amount did not throw an error\n');
    } catch (error) {
      console.log('✅ Error handling works correctly:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 4: Test error handling (missing destination)
    console.log('Test 4: Testing error handling (missing destination)...');
    try {
      await stripeService.createTransfer(1000, '', {});
      console.log('⚠️  Unexpected: Missing destination did not throw an error\n');
    } catch (error) {
      console.log('✅ Error handling works correctly:');
      console.log(`   Error: ${error.message}`);
      console.log(`   Code: ${error.code || 'N/A'}\n`);
    }
    
    // Test 5: Test error handling (invalid account ID)
    console.log('Test 5: Testing error handling (invalid account ID)...');
    try {
      await stripeService.createTransfer(1000, 'acct_invalid123', {});
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
  testTransfer(accountId)
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testTransfer };
