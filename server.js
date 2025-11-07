require('dotenv').config();
const app = require('./src/app');
const path = require('path');
const fs = require('fs');
const { connectToDatabase, closeDatabaseConnection } = require('./src/config/database');

// Ensure upload directories exist
const uploadDirs = [
  path.join(__dirname, 'uploads', 'images'),
  path.join(__dirname, 'uploads', 'videos'),
  path.join(__dirname, 'uploads', 'audio'),
  path.join(__dirname, 'uploads', 'thumbnails')
];

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const PORT = process.env.PORT || 3000;

// Connect to MongoDB and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectToDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Media API server running on port ${PORT}`);
      console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads'}`);
      console.log(`🌐 API base URL: ${process.env.API_BASE_URL || `http://localhost:${PORT}`}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeDatabaseConnection();
  process.exit(0);
});

startServer();

