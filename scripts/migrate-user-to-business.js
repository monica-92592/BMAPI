require('dotenv').config();
const { connectToDatabase, closeDatabaseConnection } = require('../src/config/database');
const User = require('../src/models/User');
const Business = require('../src/models/Business');

async function migrateUsersToBusinesses() {
  try {
    console.log('🔄 Starting User to Business migration...\n');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database\n');
    
    // Read all existing Users
    const users = await User.find({});
    console.log(`📊 Found ${users.length} users to migrate\n`);
    
    if (users.length === 0) {
      console.log('ℹ️  No users found. Migration complete.');
      await closeDatabaseConnection();
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Migrate each user
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      try {
        // Check if business already exists with this email
        const existingBusiness = await Business.findOne({ email: user.email });
        if (existingBusiness) {
          console.log(`⏭️  [${i + 1}/${users.length}] Business already exists for ${user.email}, skipping...`);
          continue;
        }
        
        // Create Business document with User fields copied
        const businessData = {
          // Copy all User fields (except password - will set separately)
          email: user.email,
          name: user.name,
          role: user.role,
          isVerified: user.isVerified,
          verificationToken: user.verificationToken,
          
          // Default business fields
          companyName: user.name, // Use name as companyName
          companyType: 'other', // Default to 'other'
          industry: 'general', // Default industry
          
          // Membership tier (default to 'free')
          membershipTier: 'free',
          subscriptionStatus: 'active',
          
          // Initialize financial fields to 0
          revenueBalance: 0,
          totalEarnings: 0,
          totalSpent: 0,
          
          // Initialize resource limits to 0
          uploadCount: 0,
          downloadCount: 0,
          activeLicenseCount: 0,
          
          // Initialize limit reset timestamps to createdAt
          lastUploadReset: user.createdAt || new Date(),
          lastDownloadReset: user.createdAt || new Date(),
          
          // Initialize arrays to empty (they default to empty arrays)
          transactionHistory: [],
          proposalsCreated: [],
          votesCast: [],
          mediaPortfolio: [],
          licensesAsLicensor: [],
          licensesAsLicensee: [],
          collectionsOwned: [],
          collectionsMemberOf: [],
          
          // Preserve timestamps
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        };
        
        // Add password (already hashed from User)
        businessData.password = user.password;
        
        // Insert directly into collection to bypass Mongoose pre-save hooks
        // This prevents password rehashing since it's already hashed
        const result = await Business.collection.insertOne(businessData);
        
        // Fetch the created business for logging
        const business = await Business.findById(result.insertedId);
        
        successCount++;
        console.log(`✅ [${i + 1}/${users.length}] Migrated: ${user.email} → ${businessData.companyName}`);
        
      } catch (error) {
        errorCount++;
        const errorMsg = `❌ [${i + 1}/${users.length}] Failed to migrate ${user.email}: ${error.message}`;
        console.error(errorMsg);
        errors.push({ email: user.email, error: error.message });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   Total users: ${users.length}`);
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(50) + '\n');
    
    if (errors.length > 0) {
      console.log('❌ Errors encountered:');
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.email}: ${err.error}`);
      });
      console.log('');
    }
    
    if (successCount > 0) {
      console.log('✅ Migration completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
    process.exit(0);
  }
}

// Run migration
if (require.main === module) {
  migrateUsersToBusinesses();
}

module.exports = { migrateUsersToBusinesses };

