# Media API

A production-ready Media API built with Node.js and Express.js for handling file uploads, processing, and serving. Supports images, videos, and audio files with automatic thumbnail generation, image processing, and streaming capabilities.

## Features

- ✅ **File Upload**: Support for images (jpg, png, gif, webp), videos (mp4, mov, avi), and audio (mp3, wav)
- ✅ **File Validation**: Type and size validation with configurable limits
- ✅ **Image Processing**: Resize, convert formats, optimize images using Sharp
- ✅ **Automatic Thumbnails**: Auto-generate thumbnails for uploaded images
- ✅ **File Streaming**: Stream video/audio files with range request support
- ✅ **Pagination & Filtering**: List files with pagination and filter by type/category
- ✅ **File Search**: Search files by name
- ✅ **Bulk Upload**: Upload multiple files at once
- ✅ **Statistics**: Get file statistics (total files, storage used)
- ✅ **Security**: Helmet.js, CORS, rate limiting
- ✅ **Error Handling**: Comprehensive error handling with meaningful messages

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd media-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp env.example .env
   ```

4. **Configure `.env` file**
   ```env
   PORT=3000
   UPLOAD_DIR=./uploads
   MAX_FILE_SIZE_IMAGE=10485760
   MAX_FILE_SIZE_VIDEO=104857600
   MAX_FILE_SIZE_AUDIO=20971520
   API_BASE_URL=http://localhost:3000
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check

**GET** `/health`

Check if the API is running.

**Response:**
```json
{
  "success": true,
  "message": "Media API is running",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

### Upload File

**POST** `/api/media/upload`

Upload a single file.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (file field)

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/media/upload \
  -F "file=@/path/to/image.jpg"
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "image-1234567890-abc123.jpg",
    "originalName": "image.jpg",
    "mimetype": "image/jpeg",
    "category": "image",
    "size": 1024000,
    "path": "./uploads/images/image-1234567890-abc123.jpg",
    "url": "http://localhost:3000/api/media/file/image-1234567890-abc123.jpg",
    "downloadUrl": "http://localhost:3000/api/media/file/image-1234567890-abc123.jpg",
    "thumbnailUrl": "http://localhost:3000/api/media/file/thumbnails/image-1234567890-abc123.jpg",
    "metadata": {
      "width": 1920,
      "height": 1080,
      "format": "jpeg"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "File uploaded successfully"
}
```

---

### Bulk Upload

**POST** `/api/media/upload/bulk`

Upload multiple files at once (max 10 files).

**Request:**
- Content-Type: `multipart/form-data`
- Body: `files` (array of files)

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/media/upload/bulk \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg"
```

**Response (201):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid1",
      "filename": "image1-1234567890-abc123.jpg",
      ...
    },
    {
      "id": "uuid2",
      "filename": "image2-1234567890-abc123.jpg",
      ...
    }
  ],
  "message": "2 file(s) uploaded"
}
```

---

### Get File by ID

**GET** `/api/media/:id`

Get file metadata by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "image-1234567890-abc123.jpg",
    "originalName": "image.jpg",
    "mimetype": "image/jpeg",
    "category": "image",
    "size": 1024000,
    "url": "http://localhost:3000/api/media/file/image-1234567890-abc123.jpg",
    ...
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "File not found",
  "message": "File with ID uuid not found"
}
```

---

### List Files

**GET** `/api/media`

List all files with pagination and filtering.

**Query Parameters:**
- `limit` (optional): Number of files per page (default: 10)
- `offset` (optional): Number of files to skip (default: 0)
- `type` (optional): Filter by MIME type (e.g., `image/jpeg`)
- `category` (optional): Filter by category (`image`, `video`, `audio`)

**Example:**
```
GET /api/media?limit=20&offset=0&category=image
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid1",
      "filename": "image1.jpg",
      ...
    },
    {
      "id": "uuid2",
      "filename": "image2.jpg",
      ...
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Search Files

**GET** `/api/media/search?q=searchterm`

Search files by name.

**Query Parameters:**
- `q` (required): Search query
- `limit` (optional): Number of results (default: 10)
- `offset` (optional): Number of results to skip (default: 0)

**Example:**
```
GET /api/media/search?q=photo&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "filename": "photo.jpg",
      ...
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

---

### Get Statistics

**GET** `/api/media/stats`

Get file statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalFiles": 150,
    "totalSize": 524288000,
    "totalSizeMB": "500.00",
    "byCategory": {
      "image": 100,
      "video": 40,
      "audio": 10
    }
  }
}
```

---

### Serve File

**GET** `/api/media/file/:filename`

Serve a file directly (for viewing/downloading).

**Example:**
```
GET /api/media/file/image-1234567890-abc123.jpg
```

**Response:**
- Returns the file with appropriate Content-Type headers
- Supports range requests for video/audio streaming

---

### Serve Thumbnail

**GET** `/api/media/file/thumbnails/:filename`

Serve a thumbnail image.

**Example:**
```
GET /api/media/file/thumbnails/image-1234567890-abc123.jpg
```

---

### Process Image

**POST** `/api/media/process/:id`

Process an image (resize, convert format, optimize).

**Request Body:**
```json
{
  "width": 800,
  "height": 600,
  "format": "jpeg",
  "quality": 80,
  "fit": "inside",
  "optimize": true
}
```

**Body Parameters:**
- `width` (optional): Target width in pixels
- `height` (optional): Target height in pixels
- `format` (optional): Output format (`jpeg`, `png`, `webp`)
- `quality` (optional): Image quality 1-100 (default: 80)
- `fit` (optional): Fit strategy (`inside`, `cover`, `contain`, `fill`) (default: `inside`)
- `optimize` (optional): Optimize image size (default: false)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "image-1234567890-abc123-processed.jpeg",
    "processedFrom": "original-uuid",
    "processingOptions": {
      "width": 800,
      "height": 600,
      "format": "jpeg",
      "quality": 80
    },
    ...
  },
  "message": "Image processed successfully"
}
```

---

### Delete File

**DELETE** `/api/media/:id`

Delete a file from storage and registry.

**Response (200):**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": "File not found",
  "message": "File with ID uuid not found"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Common HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors, invalid file type/size)
- `404`: Not Found
- `500`: Internal Server Error

### Example Error Responses

**File too large:**
```json
{
  "success": false,
  "error": "File too large",
  "message": "The uploaded file exceeds the maximum allowed size"
}
```

**Invalid file type:**
```json
{
  "success": false,
  "error": "Upload error",
  "message": "Invalid file type. Allowed types: images (image/jpeg, image/png, ...)"
}
```

**Rate limit exceeded:**
```json
{
  "success": false,
  "error": "Too many requests",
  "message": "Too many requests from this IP, please try again later"
}
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `UPLOAD_DIR` | Upload directory path | `./uploads` |
| `MAX_FILE_SIZE_IMAGE` | Max image file size (bytes) | `10485760` (10MB) |
| `MAX_FILE_SIZE_VIDEO` | Max video file size (bytes) | `104857600` (100MB) |
| `MAX_FILE_SIZE_AUDIO` | Max audio file size (bytes) | `20971520` (20MB) |
| `API_BASE_URL` | Base URL for file URLs | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

---

## File Storage Structure

```
uploads/
├── images/
│   └── [uploaded image files]
├── videos/
│   └── [uploaded video files]
├── audio/
│   └── [uploaded audio files]
└── thumbnails/
    └── [generated thumbnails]
```

---

## Supported File Types

### Images
- JPEG/JPG
- PNG
- GIF
- WebP

### Videos
- MP4
- MOV (QuickTime)
- AVI

### Audio
- MP3
- WAV

---

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server on file changes.

### Project Structure

```
media-api/
├── src/
│   ├── controllers/
│   │   ├── mediaController.js
│   │   ├── fileController.js
│   │   └── imageController.js
│   ├── middlewares/
│   │   ├── upload.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   └── mediaRoutes.js
│   ├── utils/
│   │   ├── fileValidation.js
│   │   ├── fileProcessor.js
│   │   └── fileRegistry.js
│   └── app.js
├── uploads/
│   ├── images/
│   ├── videos/
│   ├── audio/
│   └── thumbnails/
├── .env
├── .gitignore
├── package.json
├── server.js
└── README.md
```

---

## Future Enhancements

- [ ] Database integration (replace in-memory registry)
- [ ] S3/cloud storage support
- [ ] Video thumbnail generation
- [ ] Audio metadata extraction (duration, bitrate)
- [ ] Image watermarking
- [ ] CDN integration
- [ ] Authentication/authorization
- [ ] File versioning
- [ ] Batch operations API

---

## License

ISC

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## Support

For issues and questions, please open an issue on GitHub.

