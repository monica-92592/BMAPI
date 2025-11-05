# Quick Start Guide

## Installation Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env` file**
   ```bash
   cp env.example .env
   ```

3. **Start the server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

## Testing the API

### 1. Health Check
```bash
curl http://localhost:3000/health
```

### 2. Upload a File
```bash
curl -X POST http://localhost:3000/api/media/upload \
  -F "file=@/path/to/your/image.jpg"
```

### 3. List Files
```bash
curl http://localhost:3000/api/media
```

### 4. Get File by ID
```bash
curl http://localhost:3000/api/media/{file-id}
```

### 5. View File
Open in browser:
```
http://localhost:3000/api/media/file/{filename}
```

## Next Steps

- See `README.md` for complete API documentation
- See `IMPLEMENTATION_PLAN.md` for implementation details

