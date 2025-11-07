require('dotenv').config();
const { connectToDatabase, testConnection, closeDatabaseConnection } = require('./src/config/database');

async function verifyConnection() {
  console.log('🔍 Testing MongoDB connection...\n');
  
  try {
    // Test connection
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('\n✅ Connection successful!');
      
      // Get connection details
      const connection = await connectToDatabase();
      console.log(`📊 Database: ${connection.db.databaseName}`);
      console.log(`🌐 Host: ${connection.host}`);
      console.log(`🔌 Port: ${connection.port}`);
      console.log(`📝 Ready State: ${connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);
      
      // Test a simple query
      const collections = await connection.db.listCollections().toArray();
      console.log(`\n📁 Collections in database: ${collections.length}`);
      if (collections.length > 0) {
        console.log('   Collections:', collections.map(c => c.name).join(', '));
      }
      
      // Close connection
      await closeDatabaseConnection();
      console.log('\n✅ Connection test completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Connection failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error testing connection:', error.message);
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Check your MongoDB URI in .env file');
    console.error('   2. Verify your MongoDB Atlas network access settings');
    console.error('   3. Ensure your IP address is whitelisted in MongoDB Atlas');
    console.error('   4. Check your username and password are correct');
    process.exit(1);
  }
}

verifyConnection();

