require('dotenv').config();
const { connectToDatabase, closeDatabaseConnection } = require('../src/config/database');
const Media = require('../src/models/Media');
const User = require('../src/models/User');
const Business = require('../src/models/Business');

async function addLicensingFieldsToMedia() {
  try {
    console.log('🔄 Starting licensing fields migration for Media...\n');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database\n');
    
    // Read all existing Media documents
    const mediaFiles = await Media.find({});
    console.log(`📊 Found ${mediaFiles.length} media files to migrate\n`);
    
    if (mediaFiles.length === 0) {
      console.log('ℹ️  No media files found. Migration complete.');
      await closeDatabaseConnection();
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Migrate each media file
    for (let i = 0; i < mediaFiles.length; i++) {
      const media = mediaFiles[i];
      
      try {
        let needsUpdate = false;
        const updateData = {};
        
        // Set default licensing fields if they don't exist
        if (media.isLicensable === undefined || media.isLicensable === null) {
          updateData.isLicensable = false;
          needsUpdate = true;
        }
        
        if (!media.ownershipModel || media.ownershipModel === null) {
          updateData.ownershipModel = 'individual';
          needsUpdate = true;
        }
        
        // Initialize arrays to empty if they don't exist
        if (!media.tags || !Array.isArray(media.tags)) {
          updateData.tags = [];
          needsUpdate = true;
        }
        
        if (!media.licenseTypes || !Array.isArray(media.licenseTypes)) {
          updateData.licenseTypes = [];
          needsUpdate = true;
        }
        
        if (!media.activeLicenses || !Array.isArray(media.activeLicenses)) {
          updateData.activeLicenses = [];
          needsUpdate = true;
        }
        
        // Set default pricing structure
        if (!media.pricing || typeof media.pricing !== 'object') {
          updateData.pricing = {
            basePrice: 0,
            currency: 'USD',
            licenseType: null
          };
          needsUpdate = true;
        } else {
          // Ensure pricing object has all required fields
          const pricingUpdate = {};
          if (media.pricing.basePrice === undefined || media.pricing.basePrice === null) {
            pricingUpdate['pricing.basePrice'] = 0;
            needsUpdate = true;
          }
          if (!media.pricing.currency) {
            pricingUpdate['pricing.currency'] = 'USD';
            needsUpdate = true;
          }
          if (Object.keys(pricingUpdate).length > 0) {
            Object.assign(updateData, pricingUpdate);
          }
        }
        
        // Set default usage restrictions structure
        if (!media.usageRestrictions || typeof media.usageRestrictions !== 'object') {
          updateData.usageRestrictions = {
            geographic: [],
            duration: null,
            modification: false
          };
          needsUpdate = true;
        } else {
          // Ensure usageRestrictions object has all required fields
          const restrictionsUpdate = {};
          if (!media.usageRestrictions.geographic || !Array.isArray(media.usageRestrictions.geographic)) {
            restrictionsUpdate['usageRestrictions.geographic'] = [];
            needsUpdate = true;
          }
          if (media.usageRestrictions.modification === undefined || media.usageRestrictions.modification === null) {
            restrictionsUpdate['usageRestrictions.modification'] = false;
            needsUpdate = true;
          }
          if (Object.keys(restrictionsUpdate).length > 0) {
            Object.assign(updateData, restrictionsUpdate);
          }
        }
        
        // Set default license count
        if (media.licenseCount === undefined || media.licenseCount === null) {
          updateData.licenseCount = 0;
          needsUpdate = true;
        }
        
        // Update ownerId references from User to Business
        if (media.ownerId) {
          try {
            // Try to find as Business first
            let business = await Business.findById(media.ownerId);
            
            if (!business) {
              // If not found as Business, try to find as User and get corresponding Business
              const user = await User.findById(media.ownerId);
              if (user) {
                // Find Business with same email
                business = await Business.findOne({ email: user.email });
                if (business) {
                  updateData.ownerId = business._id;
                  needsUpdate = true;
                  console.log(`   🔄 Updating ownerId for ${media.originalName}: User ${user.email} → Business ${business.companyName}`);
                } else {
                  console.log(`   ⚠️  No Business found for User ${user.email} (media: ${media.originalName})`);
                }
              }
            }
          } catch (error) {
            console.log(`   ⚠️  Error checking ownerId for ${media.originalName}: ${error.message}`);
          }
        }
        
        // Update media if needed
        if (needsUpdate) {
          await Media.updateOne(
            { _id: media._id },
            { $set: updateData }
          );
          
          successCount++;
          console.log(`✅ [${i + 1}/${mediaFiles.length}] Updated: ${media.originalName || media.filename}`);
        } else {
          console.log(`⏭️  [${i + 1}/${mediaFiles.length}] No update needed: ${media.originalName || media.filename}`);
        }
        
      } catch (error) {
        errorCount++;
        const errorMsg = `❌ [${i + 1}/${mediaFiles.length}] Failed to migrate ${media.originalName || media.filename}: ${error.message}`;
        console.error(errorMsg);
        errors.push({ 
          filename: media.originalName || media.filename, 
          id: media._id,
          error: error.message 
        });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   Total media files: ${mediaFiles.length}`);
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ⏭️  No update needed: ${mediaFiles.length - successCount - errorCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(50) + '\n');
    
    if (errors.length > 0) {
      console.log('❌ Errors encountered:');
      errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. ${err.filename} (ID: ${err.id}): ${err.error}`);
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
  addLicensingFieldsToMedia();
}

module.exports = { addLicensingFieldsToMedia };

