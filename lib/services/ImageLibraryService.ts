import { z } from 'zod';
import AIService, { AIResult } from '@/lib/ai/aiService';
import { put, del } from '@vercel/blob';
import { prisma } from '../db';
import { ImageGenerationService } from './ImageGenerationService';
import { MODELS } from '@/lib/ai/models';

// Input validation schema for image generation
const ImageGenerationInputSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(1000, 'Prompt too long'),
  userId: z.string().min(1, 'User ID is required'),
  organizationId: z.string().optional(),
  campaignTitle: z.string().optional(),
  theme: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  isPublic: z.boolean().optional().default(false),
});

// Input schema for searching images
const ImageSearchInputSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  organizationId: z.string().optional(),
  theme: z.string().optional(),
  tags: z.array(z.string()).optional(),
  includePublic: z.boolean().optional().default(true),
  limit: z.number().min(1).max(50).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

// Response schemas
const GeneratedImageResponseSchema = z.object({
  id: z.string().describe('Database ID of the generated image'),
  blobUrl: z.string().describe('Public URL of the image in Vercel Blob'),
  filename: z.string().describe('Original filename'),
  prompt: z.string().describe('AI prompt used to generate the image'),
  theme: z.string().optional().describe('Detected theme'),
  tags: z.array(z.string()).describe('Searchable tags'),
  width: z.number().optional(),
  height: z.number().optional(),
  createdAt: z.date().describe('When the image was created'),
});

const ImageSearchResponseSchema = z.object({
  images: z.array(GeneratedImageResponseSchema).describe('Array of matching images'),
  total: z.number().describe('Total number of matching images'),
  hasMore: z.boolean().describe('Whether there are more results'),
});

export type ImageGenerationInput = z.infer<typeof ImageGenerationInputSchema>;
export type ImageSearchInput = z.infer<typeof ImageSearchInputSchema>;
export type GeneratedImageResponse = z.infer<typeof GeneratedImageResponseSchema>;
export type ImageSearchResponse = z.infer<typeof ImageSearchResponseSchema>;

/**
 * Service for AI image generation with Vercel Blob storage and database tracking
 */
export class ImageLibraryService extends AIService {
  constructor() {
    super({
      logPrefix: 'ImageLibrary',
      timeoutMs: 90000, // Longer timeout for image generation and upload
    });
  }

  /**
   * Generate a new AI image and store it in Vercel Blob
   */
  async generateAndStoreImage(input: ImageGenerationInput): Promise<AIResult<GeneratedImageResponse>> {
    // Validate input
    const validatedInput = this.validateInput(input, ImageGenerationInputSchema, 'generateImage');

    try {
      this.log(`🎨 Generating AI image with prompt: "${validatedInput.prompt.substring(0, 100)}..."`);
      
      // Use ImageGenerationService to generate the image
      const imageGenService = new ImageGenerationService();
      
      // Create a temporary campaign-like object for the generation service
      const imageGenInput = {
        id: `temp-${Date.now()}`, // Temporary ID for generation
        title: validatedInput.campaignTitle || 'Generated Image',
        summary: validatedInput.prompt.substring(0, 200),
        description: validatedInput.prompt,
      };

      // Generate the image using the existing service
      const response = await imageGenService.generateCampaignImage(imageGenInput);
      
      // Generate filename for blob storage
      const timestamp = Date.now();
      const filename = `ai-generated-${timestamp}.png`;

      // Upload to Vercel Blob
      this.log(`☁️ Uploading image to Vercel Blob`);
      const blob = await put(filename, response.data.image, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      // Extract theme from prompt if not provided
      const detectedTheme = validatedInput.theme || this.detectTheme(validatedInput.prompt);
      
      // Generate tags from prompt if not provided
      const generatedTags = (validatedInput.tags && validatedInput.tags.length > 0) 
        ? validatedInput.tags 
        : this.generateTags(validatedInput.prompt);

      // Save to database
      this.log(`💾 Saving image metadata to database`);
      const savedImage = await prisma.generatedImage.create({
        data: {
          userId: validatedInput.userId,
          organizationId: validatedInput.organizationId,
          filename,
          blobUrl: blob.url,
          blobKey: blob.pathname,
          width: 1024,
          height: 1024,
          fileSize: response.data.image.length,
          mimeType: 'image/png',
          prompt: validatedInput.prompt,
          model: MODELS.image, // Updated to use the correct model
          theme: detectedTheme,
          tags: generatedTags,
          campaignTitle: validatedInput.campaignTitle,
          isPublic: validatedInput.isPublic,
        },
      });

      const result = {
        id: savedImage.id,
        blobUrl: blob.url,
        filename,
        prompt: validatedInput.prompt,
        theme: detectedTheme,
        tags: generatedTags,
        width: 1024,
        height: 1024,
        createdAt: savedImage.createdAt,
      };

      this.log(`✅ Successfully generated and stored image: ${result.id}`);
      
      return {
        data: result,
        metadata: {
          executionTimeMs: response.metadata.executionTimeMs,
          retries: response.metadata.retries,
          model: MODELS.image
        }
      };

    } catch (error) {
      this.log(`❌ Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Search for previously generated images
   */
  async searchImages(input: ImageSearchInput): Promise<ImageSearchResponse> {
    const validatedInput = this.validateInput(input, ImageSearchInputSchema, 'searchImages');

    try {
      this.log(`🔍 Searching images for user: ${validatedInput.userId}`);

      // Build search conditions
      const where: any = {
        OR: [
          { userId: validatedInput.userId }, // User's own images
        ]
      };

      // Add organization images if organizationId provided
      if (validatedInput.organizationId) {
        where.OR.push({ organizationId: validatedInput.organizationId });
      }

      // Add public images if requested
      if (validatedInput.includePublic) {
        where.OR.push({ isPublic: true });
      }

      // Add theme filter if provided
      if (validatedInput.theme) {
        where.theme = validatedInput.theme;
      }

      // Add tags filter if provided
      if (validatedInput.tags && validatedInput.tags.length > 0) {
        where.tags = {
          hasSome: validatedInput.tags
        };
      }

      // Get total count
      const total = await prisma.generatedImage.count({ where });

      // Get images with pagination
      const images = await prisma.generatedImage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: validatedInput.offset || 0,
        take: validatedInput.limit || 20,
        select: {
          id: true,
          blobUrl: true,
          filename: true,
          prompt: true,
          theme: true,
          tags: true,
          width: true,
          height: true,
          createdAt: true,
          usageCount: true,
          user: {
            select: { name: true, email: true }
          },
          organization: {
            select: { name: true }
          }
        }
      });

      const hasMore = (validatedInput.offset || 0) + (validatedInput.limit || 20) < total;

      this.log(`📊 Found ${images.length} images (${total} total)`);

      return {
        images: images.map((img: any) => ({
          id: img.id,
          blobUrl: img.blobUrl,
          filename: img.filename,
          prompt: img.prompt,
          theme: img.theme || undefined,
          tags: img.tags,
          width: img.width || undefined,
          height: img.height || undefined,
          createdAt: img.createdAt,
        })),
        total,
        hasMore,
      };

    } catch (error) {
      this.log(`❌ Image search failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Increment usage count when an image is used
   */
  async useImage(imageId: string): Promise<void> {
    try {
      await prisma.generatedImage.update({
        where: { id: imageId },
        data: {
          usageCount: {
            increment: 1
          }
        }
      });
      this.log(`📈 Incremented usage count for image: ${imageId}`);
    } catch (error) {
      this.log(`⚠️ Failed to increment usage count: ${error instanceof Error ? error.message : 'Unknown error'}`, 'warn');
    }
  }

  /**
   * Delete an image from both blob storage and database
   */
  async deleteImage(imageId: string, userId: string): Promise<void> {
    try {
      // Get image to verify ownership and get blob key
      const image = await prisma.generatedImage.findFirst({
        where: {
          id: imageId,
          OR: [
            { userId },
            { organization: { ownerId: userId } } // Org owner can delete org images
          ]
        }
      });

      if (!image) {
        throw new Error('Image not found or access denied');
      }

      // Delete from Vercel Blob
      await del(image.blobKey, {
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      // Delete from database
      await prisma.generatedImage.delete({
        where: { id: imageId }
      });

      this.log(`🗑️ Deleted image: ${imageId}`);
    } catch (error) {
      this.log(`❌ Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Detect theme from prompt text
   */
  private detectTheme(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('ai') || lowerPrompt.includes('artificial intelligence') || lowerPrompt.includes('machine learning')) {
      return 'ai';
    }
    if (lowerPrompt.includes('healthcare') || lowerPrompt.includes('medical') || lowerPrompt.includes('health')) {
      return 'healthcare';
    }
    if (lowerPrompt.includes('fintech') || lowerPrompt.includes('finance') || lowerPrompt.includes('financial')) {
      return 'finance';
    }
    if (lowerPrompt.includes('education') || lowerPrompt.includes('learning') || lowerPrompt.includes('school')) {
      return 'education';
    }
    if (lowerPrompt.includes('retail') || lowerPrompt.includes('ecommerce') || lowerPrompt.includes('shopping')) {
      return 'retail';
    }
    if (lowerPrompt.includes('security') || lowerPrompt.includes('cybersecurity') || lowerPrompt.includes('cyber')) {
      return 'security';
    }
    if (lowerPrompt.includes('saas') || lowerPrompt.includes('software') || lowerPrompt.includes('tech')) {
      return 'technology';
    }
    
    return 'general';
  }

  /**
   * Generate searchable tags from prompt
   */
  private generateTags(prompt: string): string[] {
    const tags: string[] = [];
    const lowerPrompt = prompt.toLowerCase();
    
    // Technology keywords
    const techKeywords = ['ai', 'dashboard', 'mobile', 'app', 'cloud', 'saas', 'api', 'data', 'analytics'];
    techKeywords.forEach(keyword => {
      if (lowerPrompt.includes(keyword)) tags.push(keyword);
    });

    // Industry keywords
    const industryKeywords = ['healthcare', 'fintech', 'education', 'retail', 'security', 'manufacturing'];
    industryKeywords.forEach(keyword => {
      if (lowerPrompt.includes(keyword)) tags.push(keyword);
    });

    // Visual style keywords
    const styleKeywords = ['modern', 'professional', 'clean', 'minimalist', 'vibrant', 'gradient'];
    styleKeywords.forEach(keyword => {
      if (lowerPrompt.includes(keyword)) tags.push(keyword);
    });

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Check if image generation and blob storage are available
   */
  static isAvailable(): boolean {
    return !!(process.env.OPENAI_API_KEY && process.env.BLOB_READ_WRITE_TOKEN);
  }
}

export default ImageLibraryService;