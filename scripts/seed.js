require('dotenv').config();
const mongoose = require('mongoose');
const { connectToDatabase, closeDatabaseConnection } = require('../src/config/database');
const User = require('../src/models/User');
const Media = require('../src/models/Media');

// Sample data
const sampleUsers = [
  {
    email: 'john@example.com',
    password: 'password123',
    name: 'John Doe',
    role: 'user'
  },
  {
    email: 'jane@example.com',
    password: 'password123',
    name: 'Jane Smith',
    role: 'user'
  },
  {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User',
    role: 'admin'
  },
  {
    email: 'bob@example.com',
    password: 'password123',
    name: 'Bob Johnson',
    role: 'user'
  },
  {
    email: 'alice@example.com',
    password: 'password123',
    name: 'Alice Williams',
    role: 'user'
  }
];

const sampleMedia = [
  {
    filename: 'sample-image-1.jpg',
    originalName: 'beautiful-sunset.jpg',
    mimetype: 'image/jpeg',
    category: 'image',
    size: 2048576, // 2MB
    url: 'https://res.cloudinary.com/ddhsk7u5r/image/upload/v123/sample-image-1.jpg',
    cloudinaryId: 'sample-image-1',
    thumbnailUrl: 'https://res.cloudinary.com/ddhsk7u5r/image/upload/c_thumb,w_200,h_200/v123/sample-image-1.jpg',
    thumbnailCloudinaryId: 'thumbnails/sample-image-1',
    metadata: {
      width: 1920,
      height: 1080,
      format: 'jpeg'
    }
  },
  {
    filename: 'sample-image-2.jpg',
    originalName: 'mountain-landscape.jpg',
    mimetype: 'image/jpeg',
    category: 'image',
    size: 1536000, // 1.5MB
    url: 'https://res.cloudinary.com/ddhsk7u5r/image/upload/v123/sample-image-2.jpg',
    cloudinaryId: 'sample-image-2',
    thumbnailUrl: 'https://res.cloudinary.com/ddhsk7u5r/image/upload/c_thumb,w_200,h_200/v123/sample-image-2.jpg',
    thumbnailCloudinaryId: 'thumbnails/sample-image-2',
    metadata: {
      width: 1600,
      height: 900,
      format: 'jpeg'
    }
  },
  {
    filename: 'sample-video-1.mp4',
    originalName: 'product-demo.mp4',
    mimetype: 'video/mp4',
    category: 'video',
    size: 15728640, // 15MB
    url: 'https://res.cloudinary.com/ddhsk7u5r/video/upload/v123/sample-video-1.mp4',
    cloudinaryId: 'sample-video-1'
  },
  {
    filename: 'sample-audio-1.mp3',
    originalName: 'background-music.mp3',
    mimetype: 'audio/mpeg',
    category: 'audio',
    size: 3145728, // 3MB
    url: 'https://res.cloudinary.com/ddhsk7u5r/video/upload/v123/sample-audio-1.mp3',
    cloudinaryId: 'sample-audio-1'
  },
  {
    filename: 'sample-image-3.jpg',
    originalName: 'city-skyline.jpg',
    mimetype: 'image/jpeg',
    category: 'image',
    size: 3072000, // 3MB
    url: 'https://res.cloudinary.com/ddhsk7u5r/image/upload/v123/sample-image-3.jpg',
    cloudinaryId: 'sample-image-3',
    thumbnailUrl: 'https://res.cloudinary.com/ddhsk7u5r/image/upload/c_thumb,w_200,h_200/v123/sample-image-3.jpg',
    thumbnailCloudinaryId: 'thumbnails/sample-image-3',
    metadata: {
      width: 2560,
      height: 1440,
      format: 'jpeg'
    }
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to MongoDB\n');
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Media.deleteMany({});
    console.log('✅ Existing data cleared\n');
    
    // Create users
    console.log('👥 Creating users...');
    const createdUsers = [];
    for (const userData of sampleUsers) {
      try {
        const user = await User.create(userData);
        createdUsers.push(user);
        console.log(`   ✅ Created user: ${user.email} (${user.name})`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`   ⚠️  User ${userData.email} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }
    console.log(`✅ Created ${createdUsers.length} users\n`);
    
    // Create media files
    console.log('📁 Creating media files...');
    const createdMedia = [];
    for (const mediaData of sampleMedia) {
      try {
        // Assign random owner from created users
        if (createdUsers.length > 0) {
          const randomUser = createdUsers[Math.floor(Math.random() * createdUsers.length)];
          mediaData.ownerId = randomUser._id;
        }
        
        const media = await Media.create(mediaData);
        createdMedia.push(media);
        console.log(`   ✅ Created media: ${media.originalName} (${media.category})`);
      } catch (error) {
        console.error(`   ❌ Error creating media ${mediaData.originalName}:`, error.message);
      }
    }
    console.log(`✅ Created ${createdMedia.length} media files\n`);
    
    // Summary
    console.log('📊 Seeding Summary:');
    console.log(`   Users: ${createdUsers.length}`);
    console.log(`   Media: ${createdMedia.length}`);
    console.log('\n✅ Database seeding completed successfully!');
    
    // Close connection
    await closeDatabaseConnection();
    
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    await closeDatabaseConnection();
    process.exit(1);
  }
}

// Run seed function
seedDatabase();

