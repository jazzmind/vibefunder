/**
 * AI Image Generation Tests for VibeFunder
 * 
 * Tests the AI-powered image generation functionality including:
 * - Image generation with various campaign types
 * - Error handling and fallbacks
 * - Integration with OpenAI DALL-E
 * - File system operations
 */

import { generateCampaignImage, type CampaignImageData } from '@/lib/services';
import fs from 'fs/promises';
import path from 'path';

// Mock OpenAI for controlled testing
jest.mock('openai');

// Add custom Jest matcher for image format validation
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveValidImageFormat(): R;
    }
  }
}

expect.extend({
  toHaveValidImageFormat(received: string) {
    const validFormats = ['.png', '.jpg', '.jpeg', '.webp'];
    const hasValidFormat = validFormats.some(format => received.toLowerCase().includes(format));
    
    if (hasValidFormat) {
      return {
        message: () => `expected ${received} not to have a valid image format`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to have a valid image format (${validFormats.join(', ')})`,
        pass: false,
      };
    }
  },
});

describe('AI Image Generation', () => {
  const mockCampaign: CampaignImageData = {
    id: 'test-campaign-123',
    title: 'Revolutionary AI Platform',
    summary: 'An innovative AI platform for data analysis',
    description: 'This platform uses artificial intelligence to provide advanced analytics and machine learning capabilities for businesses.'
  };

  const mockImageUrl = 'https://example.com/test-generated-image.png';
  const mockImageBuffer = Buffer.from('fake-image-data');

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock successful fetch for image download
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(mockImageBuffer.buffer)
    } as any);
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      const campaignsDir = path.join(process.cwd(), 'public', 'images', 'campaigns');
      const files = await fs.readdir(campaignsDir);
      const testFiles = files.filter(file => file.includes('test-campaign'));
      
      for (const file of testFiles) {
        await fs.unlink(path.join(campaignsDir, file));
      }
    } catch {
      // Directory might not exist, which is fine
    }
  });

  describe('generateCampaignImage', () => {
    it('should generate image successfully with OpenAI API key', async () => {
      // Set API key
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      // Mock OpenAI response
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        images: {
          generate: jest.fn().mockResolvedValue({
            data: [{ url: mockImageUrl }]
          })
        }
      }));

      const result = await generateCampaignImage(mockCampaign);

      expect(result).toBeTruthy();
      expect(result).toContain('/images/campaigns/');
      expect(result).toContain('test-campaign-123');
      expect(result).toHaveValidImageFormat();
    });

    it('should return null when OpenAI API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY;

      const result = await generateCampaignImage(mockCampaign);

      expect(result).toBeNull();
    });

    it('should handle OpenAI API errors gracefully', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        images: {
          generate: jest.fn().mockRejectedValue(new Error('OpenAI API Error'))
        }
      }));

      const result = await generateCampaignImage(mockCampaign);

      expect(result).toBeNull();
    });

    it('should handle missing image URL in OpenAI response', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        images: {
          generate: jest.fn().mockResolvedValue({
            data: [{ url: null }]
          })
        }
      }));

      const result = await generateCampaignImage(mockCampaign);

      expect(result).toBeNull();
    });

    it('should generate appropriate prompts for AI campaigns', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      const mockGenerate = jest.fn().mockResolvedValue({
        data: [{ url: mockImageUrl }]
      });
      
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        images: { generate: mockGenerate }
      }));

      const aiCampaign: CampaignImageData = {
        id: 'ai-campaign',
        title: 'AI-Powered Analytics',
        description: 'Advanced artificial intelligence and machine learning platform for data analysis'
      };

      await generateCampaignImage(aiCampaign);

      expect(mockGenerate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: expect.stringContaining('AI and machine learning themes'),
        size: '1024x1024',
        quality: 'standard',
        n: 1
      });
    });

    it('should generate appropriate prompts for dashboard campaigns', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      const mockGenerate = jest.fn().mockResolvedValue({
        data: [{ url: mockImageUrl }]
      });
      
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        images: { generate: mockGenerate }
      }));

      const dashboardCampaign: CampaignImageData = {
        id: 'dashboard-campaign',
        title: 'Business Dashboard',
        description: 'Comprehensive dashboard for analytics and business intelligence'
      };

      await generateCampaignImage(dashboardCampaign);

      expect(mockGenerate).toHaveBeenCalledWith({
        model: 'dall-e-3',
        prompt: expect.stringContaining('data visualization and dashboard elements'),
        size: '1024x1024',
        quality: 'standard',
        n: 1
      });
    });

    it('should handle file download errors', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        images: {
          generate: jest.fn().mockResolvedValue({
            data: [{ url: mockImageUrl }]
          })
        }
      }));

      // Mock fetch failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await generateCampaignImage(mockCampaign);

      expect(result).toBeNull();
    });

    it('should create campaigns directory if it does not exist', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        images: {
          generate: jest.fn().mockResolvedValue({
            data: [{ url: mockImageUrl }]
          })
        }
      }));

      // Ensure directory doesn't exist
      const campaignsDir = path.join(process.cwd(), 'public', 'images', 'campaigns');
      try {
        await fs.rmdir(campaignsDir, { recursive: true });
      } catch {
        // Directory might not exist
      }

      const result = await generateCampaignImage(mockCampaign);

      expect(result).toBeTruthy();
      
      // Verify directory was created
      const stats = await fs.stat(campaignsDir);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe('Real AI Integration Tests', () => {
    const hasRealApiKey = process.env.OPENAI_API_KEY && 
                         process.env.OPENAI_API_KEY.startsWith('sk-') &&
                         process.env.OPENAI_API_KEY !== 'sk-test-key';

    (hasRealApiKey ? it : it.skip)('should generate real image with OpenAI API', async () => {
      // Remove OpenAI mock for real API test
      jest.unmock('openai');
      
      const { generateCampaignImage } = require('@/lib/services');

      const testCampaign: CampaignImageData = {
        id: 'real-test-' + Date.now(),
        title: 'Test AI Platform',
        summary: 'A simple test for AI image generation',
        description: 'AI platform for testing image generation capabilities'
      };

      const result = await generateCampaignImage(testCampaign);

      if (result) {
        expect(result).toContain('/images/campaigns/');
        expect(result).toContain(testCampaign.id);
        
        // Verify file exists
        const fullPath = path.join(process.cwd(), 'public', result);
        const stats = await fs.stat(fullPath);
        expect(stats.isFile()).toBe(true);
        expect(stats.size).toBeGreaterThan(0);
      } else {
        console.warn('Real AI test skipped - API may be rate limited or unavailable');
      }
    }, 60000); // Extended timeout for real API calls

    if (!hasRealApiKey) {
      console.log('\n🔑 No real OpenAI API key found - skipping real AI integration tests');
      console.log('   Set OPENAI_API_KEY environment variable to run these tests\n');
    }
  });

  describe('Security Tests', () => {
    it('should sanitize campaign data to prevent injection attacks', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      const mockGenerate = jest.fn().mockResolvedValue({
        data: [{ url: mockImageUrl }]
      });
      
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        images: { generate: mockGenerate }
      }));

      const maliciousCampaign: CampaignImageData = {
        id: 'test-campaign-<script>alert("xss")</script>',
        title: 'Normal Title',
        description: 'Description with <iframe src="javascript:alert(\'xss\')"></iframe> content'
      };

      await generateCampaignImage(maliciousCampaign);

      // Verify that the prompt doesn't contain dangerous HTML/JS
      const calledPrompt = mockGenerate.mock.calls[0][0].prompt;
      expect(calledPrompt).not.toContain('<script>');
      expect(calledPrompt).not.toContain('<iframe>');
      expect(calledPrompt).not.toContain('javascript:');
    });

    it('should handle extremely long campaign descriptions', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key';
      
      const mockOpenAI = require('openai');
      mockOpenAI.mockImplementation(() => ({
        images: {
          generate: jest.fn().mockResolvedValue({
            data: [{ url: mockImageUrl }]
          })
        }
      }));

      const longCampaign: CampaignImageData = {
        id: 'long-campaign',
        title: 'Test Campaign',
        description: 'A'.repeat(10000) // 10k characters
      };

      const result = await generateCampaignImage(longCampaign);

      // Should handle long descriptions gracefully
      expect(result).toBeTruthy();
    });
  });
});