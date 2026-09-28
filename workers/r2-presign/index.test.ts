import { describe, it, expect } from 'vitest';

/**
 * Test utilities for R2 Presign Worker
 */

const TYPE_PREFIX_MAP: Record<string, string> = {
  weather: 'track-weather/',
  map: 'track-images/',
  championship: 'championship-logos/',
  driver: 'drivers/',
};

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .substring(0, 100);
}

function generateObjectKey(type: string, fileName?: string, entityId?: string): string {
  const prefix = TYPE_PREFIX_MAP[type];
  if (!prefix) {
    throw new Error('Invalid upload type');
  }

  const timestamp = Date.now();
  const safeName = fileName ? sanitizeFileName(fileName) : `upload-${timestamp}`;
  const entityPart = entityId ? `${sanitizeFileName(entityId)}/` : '';

  return `${prefix}${entityPart}${timestamp}-${safeName}`;
}

describe('R2 Presign Worker - Key Generation', () => {
  describe('sanitizeFileName', () => {
    it('should replace special characters with dashes', () => {
      expect(sanitizeFileName('test file!@#$.jpg')).toBe('test-file----.jpg');
    });

    it('should prevent path traversal', () => {
      expect(sanitizeFileName('../../../etc/passwd')).toBe('-.-.-etc-passwd');
    });

    it('should remove leading and trailing dots', () => {
      expect(sanitizeFileName('...test.jpg...')).toBe('test.jpg');
    });

    it('should collapse multiple dots', () => {
      expect(sanitizeFileName('test...file.jpg')).toBe('test.file.jpg');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(200) + '.jpg';
      const result = sanitizeFileName(longName);
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should preserve valid characters', () => {
      expect(sanitizeFileName('valid_File-123.jpg')).toBe('valid_File-123.jpg');
    });
  });

  describe('generateObjectKey', () => {
    it('should map weather type to track-weather prefix', () => {
      const key = generateObjectKey('weather', 'test.jpg');
      expect(key).toMatch(/^track-weather\/\d+-test\.jpg$/);
    });

    it('should map map type to track-images prefix', () => {
      const key = generateObjectKey('map', 'test.jpg');
      expect(key).toMatch(/^track-images\/\d+-test\.jpg$/);
    });

    it('should map championship type to championship-logos prefix', () => {
      const key = generateObjectKey('championship', 'test.jpg');
      expect(key).toMatch(/^championship-logos\/\d+-test\.jpg$/);
    });

    it('should map driver type to drivers prefix', () => {
      const key = generateObjectKey('driver', 'portrait.jpg', 'uuid-1');
      expect(key).toMatch(/^drivers\/uuid-1\/\d+-portrait\.jpg$/);
    });

    it('should include entity ID when provided', () => {
      const key = generateObjectKey('weather', 'test.jpg', 'race-123');
      expect(key).toMatch(/^track-weather\/race-123\/\d+-test\.jpg$/);
    });

    it('should sanitize entity ID', () => {
      const key = generateObjectKey('weather', 'test.jpg', '../../../bad');
      // leading dots stripped by sanitizeFileName → "-.-.-bad"
      expect(key).toMatch(/^track-weather\/-\.-\.-bad\/\d+-test\.jpg$/);
    });

    it('should generate default name when fileName is not provided', () => {
      const key = generateObjectKey('weather');
      expect(key).toMatch(/^track-weather\/\d+-upload-\d+$/);
    });

    it('should throw error for invalid type', () => {
      expect(() => generateObjectKey('invalid', 'test.jpg')).toThrow('Invalid upload type');
    });

    it('should include timestamp in key', async () => {
      const key1 = generateObjectKey('weather', 'test.jpg');
      await new Promise((r) => setTimeout(r, 2));
      const key2 = generateObjectKey('weather', 'test.jpg');
      expect(key1).not.toBe(key2);
    });
  });

  describe('TYPE_PREFIX_MAP', () => {
    it('should have exactly four types', () => {
      expect(Object.keys(TYPE_PREFIX_MAP)).toHaveLength(4);
    });

    it('should map to correct prefixes', () => {
      expect(TYPE_PREFIX_MAP.weather).toBe('track-weather/');
      expect(TYPE_PREFIX_MAP.map).toBe('track-images/');
      expect(TYPE_PREFIX_MAP.championship).toBe('championship-logos/');
      expect(TYPE_PREFIX_MAP.driver).toBe('drivers/');
    });

    it('should all end with trailing slash', () => {
      Object.values(TYPE_PREFIX_MAP).forEach((prefix) => {
        expect(prefix).toMatch(/\/$/);
      });
    });
  });
});
