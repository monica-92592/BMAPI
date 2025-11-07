const { validateFile, getFileTypeCategory } = require('../../../src/utils/fileValidation');

describe('File Validation Utilities', () => {
  describe('getFileTypeCategory', () => {
    test('should return "image" for image MIME types', () => {
      expect(getFileTypeCategory('image/jpeg')).toBe('image');
      expect(getFileTypeCategory('image/png')).toBe('image');
      expect(getFileTypeCategory('image/gif')).toBe('image');
      expect(getFileTypeCategory('image/webp')).toBe('image');
    });

    test('should return "video" for video MIME types', () => {
      expect(getFileTypeCategory('video/mp4')).toBe('video');
      expect(getFileTypeCategory('video/quicktime')).toBe('video');
      expect(getFileTypeCategory('video/x-msvideo')).toBe('video');
    });

    test('should return "audio" for audio MIME types', () => {
      expect(getFileTypeCategory('audio/mpeg')).toBe('audio');
      expect(getFileTypeCategory('audio/wav')).toBe('audio');
    });

    test('should return null for unsupported MIME types', () => {
      expect(getFileTypeCategory('application/pdf')).toBeNull();
      expect(getFileTypeCategory('text/plain')).toBeNull();
      expect(getFileTypeCategory('application/json')).toBeNull();
    });
  });

  describe('validateFile', () => {
    test('should validate image file', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 1024 * 1024 // 1MB
      };

      expect(() => validateFile(file)).not.toThrow();
    });

    test('should reject invalid file type', () => {
      const file = {
        mimetype: 'application/pdf',
        size: 1024
      };

      expect(() => validateFile(file)).toThrow();
    });

    test('should reject file that is too large', () => {
      const file = {
        mimetype: 'image/jpeg',
        size: 20 * 1024 * 1024 // 20MB (exceeds 10MB limit)
      };

      expect(() => validateFile(file)).toThrow();
    });
  });
});

