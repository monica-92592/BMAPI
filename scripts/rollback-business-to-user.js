require('dotenv').config();
const { connectToDatabase, closeDatabaseConnection } = require('../src/config/database');
const User = require('../src/models/User');
const Business = require('../src/models/Business');

async function rollbackBusinessesToUsers() {
  try {
    console.log('🔄 Starting Business to User rollback...\n');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database\n');
    
    // Read all existing Businesses
    const businesses = await Business.find({});
    console.log(`📊 Found ${businesses.length} businesses to rollback\n`);
    
    if (businesses.length === 0) {
      console.log('ℹ️  No businesses found. Rollback complete.');
      await closeDatabaseConnection();
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Rollback each business
    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      
      try {
        // Check if user already exists with this email
        const existingUser = await User.findOne({ email: business.email });
        if (existingUser) {
          console.log(`⏭️  [${i + 1}/${businesses.length}] User already exists for ${business.email}, skipping...`);
          continue;
        }
        
        // Create User document with Business fields copied
        const userData = {
          // Copy basic User fields from Business
          email: business.email,
          password: business.password, // Already hashed
          name: business.name,
          role: business.role,
          isVerified: business.isVerified,
          verificationToken: business.verificationToken,
          
          // Preserve timestamps
          createdAt: business.createdAt,
          updatedAt: business.updatedAt
        };
        
        // Insert directly into collection to bypass Mongoose pre-save hooks
        // This prevents password rehashing since it's already hashed
        const result = await User.collection.insertOne(userData);
        
        // Fetch the created user for logging
        const user = await User.findById(result.insertedId);
        
        successCount++;
        console.log(`✅ [${i + 1}/${businesses.length}] Rolled back: ${business.email} → ${userData.name}`);
        
      } catch (error) {
        errorCount++;
        const errorMsg = `❌ [${i + 1}/${businesses.length}] Failed to rollback ${business.email}: ${error.message}`;
        console.error(errorMsg);
        errors.push({ email: business.email, error: error.message });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Rollback Summary:');
    console.log(`   Total businesses: ${businesses.length}`);
    console.log(`   ✅ Successfully rolled back: ${successCount}`);
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
      console.log('✅ Rollback completed successfully!');
      console.log('⚠️  Note: Business documents still exist in the database.');
      console.log('   You may want to delete them manually if needed.');
    }
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
    process.exit(0);
  }
}

// Run rollback
if (require.main === module) {
  rollbackBusinessesToUsers();
}

module.exports = { rollbackBusinessesToUsers };

