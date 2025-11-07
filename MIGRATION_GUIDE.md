# Migration Guide: Complete Implementation

This guide explains the three major migrations that have been completed:

1. **In-memory file registry → MongoDB**
2. **Local storage → Cloud storage (Cloudinary)**
3. **Public API → Protected with authentication**

---

## ✅ What Has Been Completed

### 1. MongoDB Integration

**Files Created:**
- `src/models/Media.js` - Mongoose model for media files
- `src/models/User.js` - Mongoose model for users
- `src/config/database.js` - Updated to use Mongoose

**Changes:**
- Replaced in-memory `fileRegistry` with MongoDB collections
- All file operations now persist to MongoDB
- Added indexes for better query performance

### 2. Cloudinary Integration

**Files Created:**
- `src/config/cloudinary.js` - Cloudinary configuration
- `src/utils/cloudinaryUpload.js` - Cloudinary upload utilities

**Changes:**
- Upload middleware now uses memory storage (for Cloudinary)
- Files are uploaded directly to Cloudinary
- Automatic thumbnail generation for images
- File serving now redirects to Cloudinary URLs

### 3. Authentication System

**Files Created:**
- `src/middlewares/auth.js` - JWT authentication middleware
- `src/controllers/authController.js` - Authentication controllers
- `src/routes/authRoutes.js` - Authentication routes

**Changes:**
- All `/api/media/*` routes now require authentication
- JWT token-based authentication
- User registration and login endpoints
- Password hashing with bcrypt

---

## 📋 Setup Instructions

### 1. Install Dependencies

All required packages have been installed:
- `mongoose` - MongoDB ODM
- `cloudinary` - Cloud storage
- `jsonwebtoken` - JWT tokens
- `bcrypt` - Password hashing
- `axios` - HTTP client

### 2. Configure Environment Variables

Copy `env.example` to `.env` and fill in the values:

```bash
cp env.example .env
```

**Required Environment Variables:**

```env
# MongoDB (already configured)
MONGODB_URI=mongodb+srv://monica_db_user:LBfhCKmmUIuC1IoY@bmapi.gfhelui.mongodb.net/?appName=BMAPI
MONGODB_DB_NAME=bmapi

# Cloudinary (get from https://cloudinary.com)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT (change in production!)
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

### 3. Get Cloudinary Credentials

1. Sign up at [https://cloudinary.com](https://cloudinary.com)
2. Go to Dashboard
3. Copy your:
   - Cloud Name
   - API Key
   - API Secret
4. Add them to your `.env` file

---

## 🔐 Authentication Flow

### 1. Register a New User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully"
}
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:** Same format as registration

### 3. Use Token for Protected Routes

All `/api/media/*` routes now require authentication:

```bash
curl -X POST http://localhost:3000/api/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

---

## 📤 File Upload Flow

### Before (Local Storage)
1. File saved to local disk
2. Metadata stored in memory
3. Data lost on server restart

### After (Cloudinary + MongoDB)
1. File uploaded to Cloudinary
2. Metadata stored in MongoDB
3. Persistent across server restarts
4. CDN-ready URLs

**Example Upload:**
```bash
# 1. Get token first
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  | jq -r '.data.token')

# 2. Upload file with token
curl -X POST http://localhost:3000/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@image.jpg"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "filename": "image-1234567890-abc123.jpg",
    "url": "https://res.cloudinary.com/.../image.jpg",
    "thumbnailUrl": "https://res.cloudinary.com/.../thumbnails/image.jpg",
    "category": "image",
    "size": 1024000,
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "jpeg"
    }
  }
}
```

---

## 🔄 API Changes

### Protected Routes

All media routes now require authentication:

| Endpoint | Method | Auth Required |
|----------|--------|---------------|
| `/api/media/upload` | POST | ✅ Yes |
| `/api/media/upload/bulk` | POST | ✅ Yes |
| `/api/media` | GET | ✅ Yes |
| `/api/media/:id` | GET | ✅ Yes |
| `/api/media/:id` | DELETE | ✅ Yes |
| `/api/media/search` | GET | ✅ Yes |
| `/api/media/stats` | GET | ✅ Yes |
| `/api/media/process/:id` | POST | ✅ Yes |

### Public Routes

| Endpoint | Method | Auth Required |
|----------|--------|---------------|
| `/api/auth/register` | POST | ❌ No |
| `/api/auth/login` | POST | ❌ No |
| `/api/auth/me` | GET | ✅ Yes |
| `/health` | GET | ❌ No |

---

## 📁 File Structure Changes

### New Files
```
src/
├── models/
│   ├── Media.js          (NEW - MongoDB model)
│   └── User.js           (NEW - User model)
├── config/
│   ├── database.js       (UPDATED - Mongoose)
│   └── cloudinary.js     (NEW - Cloudinary config)
├── utils/
│   └── cloudinaryUpload.js (NEW - Cloudinary utilities)
├── middlewares/
│   └── auth.js           (NEW - JWT middleware)
├── controllers/
│   └── authController.js (NEW - Auth controllers)
└── routes/
    └── authRoutes.js     (NEW - Auth routes)
```

### Updated Files
- `src/controllers/mediaController.js` - Uses MongoDB & Cloudinary
- `src/controllers/fileController.js` - Redirects to Cloudinary URLs
- `src/controllers/imageController.js` - Uses MongoDB & Cloudinary
- `src/middlewares/upload.js` - Memory storage for Cloudinary
- `src/routes/mediaRoutes.js` - Updated bulk upload
- `src/app.js` - Added auth routes and protection

---

## 🚀 Testing the Migration

### 1. Test MongoDB Connection

Start the server:
```bash
npm start
```

You should see:
```
✅ Successfully connected to MongoDB with Mongoose!
🚀 Media API server running on port 3000
```

### 2. Test Authentication

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### 3. Test File Upload

```bash
# Get token
TOKEN="your-jwt-token-here"

# Upload file
curl -X POST http://localhost:3000/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg"
```

### 4. Test File Retrieval

```bash
# List files
curl -X GET http://localhost:3000/api/media \
  -H "Authorization: Bearer $TOKEN"

# Get file by ID
curl -X GET http://localhost:3000/api/media/FILE_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚠️ Important Notes

### 1. Cloudinary Setup Required

**You must set up Cloudinary before uploading files!**

Without Cloudinary credentials, file uploads will fail. Get your credentials from [Cloudinary Dashboard](https://cloudinary.com/console).

### 2. JWT Secret

**Change the JWT secret in production!**

The default secret in `env.example` is for development only. Use a strong, random secret in production.

### 3. File Serving

Files are no longer served directly from the server. The `/api/media/file/:filename` endpoint now redirects to Cloudinary URLs, which are CDN-optimized.

### 4. Data Migration

If you had existing files in the old system:
- They are not automatically migrated
- You'll need to create a migration script if needed
- New uploads will use the new system

---

## 🐛 Troubleshooting

### MongoDB Connection Error

**Error:** `MongoDB connection error`

**Solution:**
1. Check your `MONGODB_URI` in `.env`
2. Ensure MongoDB Atlas allows connections from your IP
3. Check network connectivity

### Cloudinary Upload Error

**Error:** `Cloudinary upload error`

**Solution:**
1. Verify Cloudinary credentials in `.env`
2. Check file size limits
3. Ensure Cloudinary account is active

### Authentication Error

**Error:** `Unauthorized` or `Invalid token`

**Solution:**
1. Make sure you're including the token: `Authorization: Bearer TOKEN`
2. Check if token has expired
3. Try logging in again to get a new token

---

## 📚 Next Steps

1. **Set up Cloudinary** - Get your credentials and add to `.env`
2. **Test authentication** - Register and login
3. **Test file uploads** - Upload a test file
4. **Update your frontend** - Add authentication headers to API calls
5. **Production setup** - Change JWT secret and secure environment variables

---

## ✅ Migration Complete!

All three migrations have been successfully implemented:
- ✅ In-memory registry → MongoDB
- ✅ Local storage → Cloudinary
- ✅ Public API → Protected with JWT

Your API is now production-ready with persistent storage and authentication!

