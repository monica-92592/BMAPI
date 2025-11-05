/**
 * In-memory file registry
 * This can be easily replaced with a database later
 */
const { v4: uuidv4 } = require('uuid');

class FileRegistry {
  constructor() {
    this.files = new Map();
  }

  /**
   * Create a new file record
   */
  create(fileData) {
    const id = uuidv4();
    const record = {
      id,
      ...fileData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.files.set(id, record);
    return record;
  }

  /**
   * Get file by ID
   */
  getById(id) {
    return this.files.get(id) || null;
  }

  /**
   * Get file by filename
   */
  getByFilename(filename) {
    for (const [id, file] of this.files.entries()) {
      if (file.filename === filename) {
        return file;
      }
    }
    return null;
  }

  /**
   * List all files with pagination and filtering
   */
  list(options = {}) {
    const {
      limit = 10,
      offset = 0,
      type = null,
      category = null
    } = options;

    let files = Array.from(this.files.values());

    // Filter by type
    if (type) {
      files = files.filter(file => file.mimetype === type);
    }

    // Filter by category
    if (category) {
      files = files.filter(file => file.category === category);
    }

    // Sort by creation date (newest first)
    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const total = files.length;
    const paginatedFiles = files.slice(offset, offset + limit);

    return {
      files: paginatedFiles,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Delete file record
   */
  delete(id) {
    return this.files.delete(id);
  }

  /**
   * Get statistics
   */
  getStats() {
    const files = Array.from(this.files.values());
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
    
    const byCategory = {
      image: files.filter(f => f.category === 'image').length,
      video: files.filter(f => f.category === 'video').length,
      audio: files.filter(f => f.category === 'audio').length
    };

    return {
      totalFiles,
      totalSize,
      byCategory
    };
  }

  /**
   * Search files by name
   */
  search(query, options = {}) {
    const { limit = 10, offset = 0 } = options;
    const searchTerm = query.toLowerCase();

    let files = Array.from(this.files.values())
      .filter(file => 
        file.originalName.toLowerCase().includes(searchTerm) ||
        file.filename.toLowerCase().includes(searchTerm)
      );

    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = files.length;
    const paginatedFiles = files.slice(offset, offset + limit);

    return {
      files: paginatedFiles,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    };
  }
}

// Create singleton instance
const fileRegistry = new FileRegistry();

module.exports = fileRegistry;

