const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || "mongodb+srv://monica_db_user:LBfhCKmmUIuC1IoY@bmapi.gfhelui.mongodb.net/?appName=BMAPI";

let isConnected = false;

async function connectToDatabase() {
  try {
    if (!isConnected) {
      const dbName = process.env.MONGODB_DB_NAME || 'bmapi';
      
      await mongoose.connect(uri, {
        dbName: dbName,
        serverApi: {
          version: '1',
          strict: true,
          deprecationErrors: true,
        }
      });
      
      isConnected = true;
      console.log("✅ Successfully connected to MongoDB with Mongoose!");
    }
    return mongoose.connection;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    isConnected = false;
    throw error;
  }
}

async function closeDatabaseConnection() {
  try {
    if (isConnected) {
      await mongoose.connection.close();
      console.log("✅ MongoDB connection closed");
      isConnected = false;
    }
  } catch (error) {
    console.error("❌ Error closing MongoDB connection:", error);
    throw error;
  }
}

// Test connection function
async function testConnection() {
  try {
    await connectToDatabase();
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    return true;
  } catch (error) {
    console.error("Connection test failed:", error);
    return false;
  }
}

module.exports = {
  connectToDatabase,
  closeDatabaseConnection,
  testConnection,
  getConnection: () => mongoose.connection
};

