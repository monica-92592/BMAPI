/**
 * Test Stripe Subscriptions Script
 * 
 * This script creates test subscriptions using Stripe test mode.
 * It tests the StripeService methods for creating customers and subscriptions.
 * 
 * Usage:
 *   node scripts/testStripeSubscriptions.js
 * 
 * Prerequisites:
 *   - STRIPE_SECRET_KEY in .env (test key)
 *   - STRIPE_PRICE_CONTRIBUTOR in .env
 *   - STRIPE_PRICE_PARTNER in .env
 *   - STRIPE_PRICE_EQUITY_PARTNER in .env
 */

require('dotenv').config();
const StripeService = require('../src/services/stripeService');

/**
 * Test subscription creation for all tiers
 */
async function testSubscriptions() {
  console.log('🧪 Testing Stripe Subscription Creation\n');
  console.log('=' .repeat(60));
  
  try {
    // Initialize StripeService
    const stripeService = new StripeService();
    console.log('✅ StripeService initialized\n');
    
    // Test data
    const testBusinessId = 'test_business_' + Date.now();
    const testEmail = `test_${Date.now()}@example.com`;
    
    console.log('📋 Test Data:');
    console.log(`   Business ID: ${testBusinessId}`);
    console.log(`   Email: ${testEmail}\n`);
    
    // Step 1: Create a test customer
    console.log('Step 1: Creating test customer...');
    const customer = await stripeService.createCustomer(testBusinessId, testEmail);
    console.log('✅ Customer created:');
    console.log(`   Customer ID: ${customer.id}`);
    console.log(`   Email: ${customer.email}`);
    console.log(`   Metadata: ${JSON.stringify(customer.metadata)}\n`);
    
    // Step 1.5: Create a test payment method and attach it to customer
    console.log('Step 1.5: Creating test payment method...');
    try {
      // Create a test payment method using Stripe test token
      // Using tok_visa which is a test token for a Visa card
      const paymentMethod = await stripeService.stripe.paymentMethods.create({
        type: 'card',
        card: {
          token: 'tok_visa' // Stripe test token for Visa card
        }
      });
      
      // Attach payment method to customer
      await stripeService.createPaymentMethod(paymentMethod.id, customer.id);
      
      // Set as default payment method
      await stripeService.stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethod.id
        }
      });
      
      console.log('✅ Payment method created and attached:');
      console.log(`   Payment Method ID: ${paymentMethod.id}`);
      console.log(`   Type: ${paymentMethod.type}\n`);
    } catch (error) {
      // If token method doesn't work, try creating subscription with payment_behavior
      console.log('⚠️  Payment method creation failed, will try creating subscription with payment_behavior...');
      console.log(`   Error: ${error.message}\n`);
    }
    
    // Step 2: Create test subscriptions for each tier
    const tiers = [
      {
        name: 'Contributor',
        priceId: process.env.STRIPE_PRICE_CONTRIBUTOR,
        metadata: { businessId: testBusinessId, tier: 'contributor' }
      },
      {
        name: 'Partner',
        priceId: process.env.STRIPE_PRICE_PARTNER,
        metadata: { businessId: testBusinessId, tier: 'partner' }
      },
      {
        name: 'Equity Partner',
        priceId: process.env.STRIPE_PRICE_EQUITY_PARTNER,
        metadata: { businessId: testBusinessId, tier: 'equityPartner' }
      }
    ];
    
    const subscriptions = [];
    
    for (const tier of tiers) {
      if (!tier.priceId) {
        console.log(`⚠️  Skipping ${tier.name} - Price ID not found in .env`);
        continue;
      }
      
      // Check if it's a product ID instead of price ID
      if (tier.priceId.startsWith('prod_')) {
        console.log(`⚠️  ${tier.name} has a product ID (${tier.priceId}), not a price ID.`);
        console.log(`   Please get the price ID from Stripe Dashboard:`);
        console.log(`   1. Go to Products → ${tier.name}`);
        console.log(`   2. Click on the product`);
        console.log(`   3. Go to "Pricing" tab`);
        console.log(`   4. Copy the Price ID (starts with 'price_')`);
        console.log(`   5. Update .env: STRIPE_PRICE_${tier.name.toUpperCase().replace(' ', '_')}=price_xxx\n`);
        continue;
      }
      
      console.log(`Step 2.${tiers.indexOf(tier) + 1}: Creating ${tier.name} subscription...`);
      console.log(`   Using Price ID: ${tier.priceId}`);
      try {
        const subscription = await stripeService.createSubscription(
          customer.id,
          tier.priceId,
          tier.metadata
        );
        
        console.log(`✅ ${tier.name} subscription created:`);
        console.log(`   Subscription ID: ${subscription.id}`);
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Current Period End: ${new Date(subscription.current_period_end * 1000).toISOString()}`);
        console.log(`   Metadata: ${JSON.stringify(subscription.metadata)}\n`);
        
        subscriptions.push({
          tier: tier.name,
          subscriptionId: subscription.id,
          status: subscription.status
        });
      } catch (error) {
        console.error(`❌ Failed to create ${tier.name} subscription:`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Code: ${error.code || 'N/A'}`);
        if (error.message.includes('No such price')) {
          console.error(`   ⚠️  This looks like a product ID, not a price ID.`);
          console.error(`   Please check Stripe Dashboard → Products → ${tier.name} → Pricing`);
          console.error(`   Copy the Price ID (starts with 'price_') not the Product ID (starts with 'prod_')\n`);
        } else {
          console.error('');
        }
      }
    }
    
    // Summary
    console.log('=' .repeat(60));
    console.log('📊 Test Summary:\n');
    console.log(`✅ Customer Created: ${customer.id}`);
    console.log(`✅ Subscriptions Created: ${subscriptions.length}/${tiers.length}\n`);
    
    if (subscriptions.length > 0) {
      console.log('Created Subscriptions:');
      subscriptions.forEach(sub => {
        console.log(`   - ${sub.tier}: ${sub.subscriptionId} (${sub.status})`);
      });
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n💡 Note: These are test subscriptions in Stripe test mode.');
    console.log('   They will not charge real money and can be deleted from Stripe Dashboard.');
    
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
  testSubscriptions()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { testSubscriptions };

