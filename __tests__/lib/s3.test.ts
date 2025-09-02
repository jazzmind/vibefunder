import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner");

const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;
const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

describe('s3', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Set default environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.S3_BUCKET = 'test-bucket';
    process.env.S3_SIGNED_URL_TTL_SEC = '900';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('S3Client initialization', () => {
    it('should initialize S3Client with region from environment', () => {
      jest.resetModules();
      const { s3 } = require('@/lib/s3');
      
      expect(S3Client).toHaveBeenCalledWith({ region: 'us-east-1' });
      expect(s3).toBeDefined();
    });

    it('should handle missing AWS_REGION environment variable', () => {
      // This test verifies that the module can be imported even with undefined region
      // The actual behavior depends on AWS SDK default handling
      delete process.env.AWS_REGION;
      
      // Re-import the module to test with undefined region
      jest.resetModules();
      const { s3: s3WithoutRegion } = require('@/lib/s3');
      
      expect(s3WithoutRegion).toBeDefined();
    });
  });

  describe('createUploadUrl', () => {
    it('should create signed URL with correct parameters', async () => {
      const key = 'test/file.jpg';
      const contentType = 'image/jpeg';
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
      
      jest.resetModules();
      mockGetSignedUrl.mockResolvedValue(mockUrl);
      
      const { createUploadUrl } = require('@/lib/s3');
      const result = await createUploadUrl(key, contentType);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
        ContentType: contentType
      });
      
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object), // s3 client instance
        expect.any(PutObjectCommand),
        { expiresIn: 900 }
      );

      expect(result).toEqual({
        url: mockUrl,
        bucket: 'test-bucket',
        key: key
      });
    });

    it('should use default TTL when S3_SIGNED_URL_TTL_SEC is not set', async () => {
      delete process.env.S3_SIGNED_URL_TTL_SEC;
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
      
      jest.resetModules();
      mockGetSignedUrl.mockResolvedValue(mockUrl);
      
      const { createUploadUrl } = require('@/lib/s3');
      await createUploadUrl('test-key', 'text/plain');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(PutObjectCommand),
        { expiresIn: 900 } // Default value
      );
    });

    it('should handle custom TTL from environment variable', async () => {
      process.env.S3_SIGNED_URL_TTL_SEC = '3600';
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
      
      jest.resetModules();
      mockGetSignedUrl.mockResolvedValue(mockUrl);
      
      const { createUploadUrl } = require('@/lib/s3');
      await createUploadUrl('custom-ttl-key', 'application/pdf');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(PutObjectCommand),
        { expiresIn: 3600 }
      );
    });

    it('should handle special characters in key', async () => {
      const specialKey = 'folder/file with spaces & symbols!@#$%^&*().jpg';
      const contentType = 'image/jpeg';
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
      
      jest.resetModules();
      mockGetSignedUrl.mockResolvedValue(mockUrl);
      
      const { createUploadUrl } = require('@/lib/s3');
      const result = await createUploadUrl(specialKey, contentType);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: specialKey,
        ContentType: contentType
      });

      expect(result.key).toBe(specialKey);
    });

    it('should handle empty key', async () => {
      const emptyKey = '';
      const contentType = 'text/plain';
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
      
      jest.resetModules();
      mockGetSignedUrl.mockResolvedValue(mockUrl);
      
      const { createUploadUrl } = require('@/lib/s3');
      const result = await createUploadUrl(emptyKey, contentType);

      expect(result.key).toBe(emptyKey);
    });

    it('should handle various content types', async () => {
      const testCases = [
        { contentType: 'image/png', key: 'image.png' },
        { contentType: 'application/json', key: 'data.json' },
        { contentType: 'text/csv', key: 'data.csv' },
        { contentType: 'video/mp4', key: 'video.mp4' },
        { contentType: 'application/octet-stream', key: 'binary-file' }
      ];

      jest.resetModules();
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
      mockGetSignedUrl.mockResolvedValue(mockUrl);
      
      const { createUploadUrl } = require('@/lib/s3');

      for (const testCase of testCases) {
        await createUploadUrl(testCase.key, testCase.contentType);
        
        expect(PutObjectCommand).toHaveBeenCalledWith({
          Bucket: 'test-bucket',
          Key: testCase.key,
          ContentType: testCase.contentType
        });
      }
    });

    it('should handle AWS SDK errors', async () => {
      const key = 'error-test-key';
      const contentType = 'text/plain';
      
      jest.resetModules();
      mockGetSignedUrl.mockRejectedValue(new Error('AWS SDK Error: Invalid credentials'));
      
      const { createUploadUrl } = require('@/lib/s3');
      await expect(createUploadUrl(key, contentType)).rejects.toThrow('AWS SDK Error: Invalid credentials');
    });

    it('should handle missing bucket environment variable', async () => {
      delete process.env.S3_BUCKET;
      
      // Re-import to get new environment values
      jest.resetModules();
      const { createUploadUrl: createUploadUrlNoBucket } = require('@/lib/s3');
      
      const mockUrl = 'https://undefined.s3.amazonaws.com/presigned-url';
      mockGetSignedUrl.mockResolvedValue(mockUrl);

      const result = await createUploadUrlNoBucket('test-key', 'text/plain');

      expect(result.bucket).toBeUndefined();
    });

    it('should handle invalid TTL values', async () => {
      process.env.S3_SIGNED_URL_TTL_SEC = 'invalid-number';
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
      
      jest.resetModules();
      mockGetSignedUrl.mockResolvedValue(mockUrl);
      
      const { createUploadUrl } = require('@/lib/s3');
      await createUploadUrl('ttl-test-key', 'text/plain');

      // Should use NaN when Number() returns NaN (not fallback to default)
      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(PutObjectCommand),
        { expiresIn: NaN }
      );
    });

    it('should handle zero TTL', async () => {
      process.env.S3_SIGNED_URL_TTL_SEC = '0';
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
      
      jest.resetModules();
      mockGetSignedUrl.mockResolvedValue(mockUrl);
      
      const { createUploadUrl } = require('@/lib/s3');
      await createUploadUrl('zero-ttl-key', 'text/plain');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(PutObjectCommand),
        { expiresIn: 0 }
      );
    });

    it('should handle negative TTL', async () => {
      process.env.S3_SIGNED_URL_TTL_SEC = '-300';
      const mockUrl = 'https://test-bucket.s3.amazonaws.com/presigned-url';
      
      jest.resetModules();
      mockGetSignedUrl.mockResolvedValue(mockUrl);
      
      const { createUploadUrl } = require('@/lib/s3');
      await createUploadUrl('negative-ttl-key', 'text/plain');

      expect(mockGetSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(PutObjectCommand),
        { expiresIn: -300 }
      );
    });
  });
});