require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase, closeDatabaseConnection } = require('../src/config/database');
const User = require('../src/models/User');
const Media = require('../src/models/Media');

async function clearDatabase() {
  try {
    console.log('🧹 Starting database cleanup...\n');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to MongoDB\n');
    
    // Clear all collections
    console.log('🗑️  Deleting all data...');
    
    const userCount = await User.countDocuments();
    const mediaCount = await Media.countDocuments();
    
    await User.deleteMany({});
    await Media.deleteMany({});
    
    console.log(`   ✅ Deleted ${userCount} users`);
    console.log(`   ✅ Deleted ${mediaCount} media files`);
    console.log('\n✅ Database cleared successfully!');
    
    // Close connection
    await closeDatabaseConnection();
    
  } catch (error) {
    console.error('\n❌ Error clearing database:', error);
    await closeDatabaseConnection();
    process.exit(1);
  }
}

// Run clear function
clearDatabase();

