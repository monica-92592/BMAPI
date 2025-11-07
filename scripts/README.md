# Database Seed Scripts

Scripts for managing sample data in your database.

## Available Scripts

### Seed Database
Populates the database with sample users and media files.

```bash
npm run seed
```

**What it creates:**
- 5 sample users (including 1 admin)
- 5 sample media files (3 images, 1 video, 1 audio)
- Links media files to random users

**Note:** This script will clear existing data before seeding. Comment out the clear section in `seed.js` if you want to keep existing data.

### Clear Database
Removes all data from the database.

```bash
npm run clear
```

**Warning:** This will delete all users and media files!

## Sample Data

### Users Created
- `john@example.com` / `password123` - John Doe
- `jane@example.com` / `password123` - Jane Smith
- `admin@example.com` / `admin123` - Admin User (admin role)
- `bob@example.com` / `password123` - Bob Johnson
- `alice@example.com` / `password123` - Alice Williams

### Media Files Created
- 3 sample images (with thumbnails)
- 1 sample video
- 1 sample audio file

## Customization

You can customize the seed data by editing `scripts/seed.js`:

1. **Add more users**: Add objects to the `sampleUsers` array
2. **Add more media**: Add objects to the `sampleMedia` array
3. **Change data**: Modify the sample data objects

## Usage Examples

### Seed database for testing
```bash
npm run seed
```

### Clear database and start fresh
```bash
npm run clear
npm run seed
```

### Test with seeded data
```bash
# Seed database
npm run seed

# Start server
npm start

# Test API with seeded users
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

## Notes

- Seed script uses your actual MongoDB connection
- Media files use placeholder Cloudinary URLs (not real files)
- Users are created with hashed passwords
- Media files are randomly assigned to users

