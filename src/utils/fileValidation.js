/**
 * File validation utilities
 */

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave'];

const FILE_SIZE_LIMITS = {
  image: parseInt(process.env.MAX_FILE_SIZE_IMAGE) || 10 * 1024 * 1024, // 10MB
  video: parseInt(process.env.MAX_FILE_SIZE_VIDEO) || 100 * 1024 * 1024, // 100MB
  audio: parseInt(process.env.MAX_FILE_SIZE_AUDIO) || 20 * 1024 * 1024 // 20MB
};

/**
 * Get file type category (image, video, audio)
 */
const getFileTypeCategory = (mimetype) => {
  if (ALLOWED_IMAGE_TYPES.includes(mimetype)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(mimetype)) return 'video';
  if (ALLOWED_AUDIO_TYPES.includes(mimetype)) return 'audio';
  return null;
};

/**
 * Validate file type
 */
const validateFileType = (mimetype) => {
  const category = getFileTypeCategory(mimetype);
  if (!category) {
    throw new Error(`Invalid file type. Allowed types: images (${ALLOWED_IMAGE_TYPES.join(', ')}), videos (${ALLOWED_VIDEO_TYPES.join(', ')}), audio (${ALLOWED_AUDIO_TYPES.join(', ')})`);
  }
  return category;
};

/**
 * Validate file size
 */
const validateFileSize = (size, category) => {
  const maxSize = FILE_SIZE_LIMITS[category];
  if (size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    throw new Error(`File size exceeds maximum allowed size of ${maxSizeMB}MB for ${category} files`);
  }
};

/**
 * Validate file
 */
const validateFile = (file) => {
  if (!file) {
    throw new Error('No file provided');
  }

  const category = validateFileType(file.mimetype);
  validateFileSize(file.size, category);

  return category;
};

/**
 * Get allowed MIME types
 */
const getAllowedMimeTypes = () => {
  return [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_AUDIO_TYPES];
};

module.exports = {
  validateFile,
  getFileTypeCategory,
  getAllowedMimeTypes,
  FILE_SIZE_LIMITS,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_AUDIO_TYPES
};

