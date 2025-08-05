import { z } from 'zod';
import AIService, { AIResult } from '../aiService';
import fs from 'fs/promises';
import path from 'path';

// Input validation schema
const ImageGenerationInputSchema = z.object({
  id: z.string().min(1, 'Campaign ID is required').max(100, 'Campaign ID too long'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  summary: z.string().optional(),
  description: z.string().optional(),
});

// Output schema for generated image
const ImageGenerationResponseSchema = z.object({
  imagePath: z.string().min(1, 'Image path is required').describe(
    'Public URL path to the generated image'
  ),
  prompt: z.string().min(1, 'Prompt is required').describe(
    'The AI prompt used to generate the image'
  ),
});

export type ImageGenerationInput = z.infer<typeof ImageGenerationInputSchema>;
export type ImageGenerationResponse = z.infer<typeof ImageGenerationResponseSchema>;

/**
 * Service for generating campaign images using AI
 */
export class ImageGenerationService extends AIService {
  constructor() {
    super({
      logPrefix: 'ImageGeneration',
      timeoutMs: 60000, // Longer timeout for image generation
    });
  }

  /**
   * Generate a campaign image using DALL-E
   */
  async generateCampaignImage(input: ImageGenerationInput): Promise<AIResult<ImageGenerationResponse>> {
    // Validate input
    const validatedInput = this.validateInput(input, ImageGenerationInputSchema, 'generateCampaignImage');

    try {
      this.log(`🎨 Generating AI image for campaign: ${validatedInput.title}`);
      
      // Generate AI image prompt based on campaign details
      const prompt = this.generateImagePrompt(validatedInput);
      this.log(`📝 Using prompt: ${prompt}`);

      const operationName = 'DALL-E Image Generation';
      
      const result = await this.executeWithRetry(async () => {
        // Generate image with OpenAI
        const response = await this.client.images.generate({
          model: "dall-e-3",
          prompt: prompt,
          size: "1024x1024",
          quality: "standard",
          n: 1,
        });

        const imageUrl = response.data?.[0]?.url;
        
        if (!imageUrl) {
          throw new Error('No image URL returned from OpenAI');
        }

        // Download and save the image
        const imagePath = await this.downloadAndSaveImage(imageUrl, validatedInput.id);
        
        return {
          imagePath,
          prompt,
        };
      }, operationName);

      this.log(`✅ Generated and saved image for campaign: ${validatedInput.title}`);
      
      return {
        data: result.data,
        metadata: {
          executionTimeMs: result.metadata.executionTimeMs,
          retries: result.metadata.retries,
          model: 'dall-e-3'
        }
      };

    } catch (error) {
      this.log(`❌ Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw error;
    }
  }

  /**
   * Generate an intelligent image prompt based on campaign details
   */
  private generateImagePrompt(campaign: ImageGenerationInput): string {
    // Create a sophisticated prompt based on campaign details
    const basePrompt = `Create a professional, modern hero image for a tech startup campaign titled "${campaign.title}".`;
    
    let contextPrompt = '';
    if (campaign.summary) {
      contextPrompt += ` The campaign is about: ${campaign.summary}`;
    }
    
    if (campaign.description) {
      // Extract key themes from description
      const description = campaign.description.toLowerCase();
      
      const themes = [];
      if (description.includes('ai') || description.includes('artificial intelligence')) {
        themes.push('AI and machine learning themes');
      }
      if (description.includes('dashboard') || description.includes('analytics')) {
        themes.push('data visualization and dashboard elements');
      }
      if (description.includes('mobile') || description.includes('app')) {
        themes.push('mobile and app development themes');
      }
      if (description.includes('cloud') || description.includes('saas')) {
        themes.push('cloud computing and SaaS concepts');
      }
      if (description.includes('developer') || description.includes('code')) {
        themes.push('software development and coding themes');
      }
      if (description.includes('automation') || description.includes('workflow')) {
        themes.push('workflow automation and process optimization');
      }
      if (description.includes('security') || description.includes('cybersecurity')) {
        themes.push('cybersecurity and data protection');
      }
      if (description.includes('blockchain') || description.includes('crypto')) {
        themes.push('blockchain and cryptocurrency technology');
      }
      if (description.includes('iot') || description.includes('internet of things')) {
        themes.push('IoT and connected device concepts');
      }
      if (description.includes('fintech') || description.includes('financial')) {
        themes.push('fintech and financial technology');
      }

      if (themes.length > 0) {
        contextPrompt += ` Focus on: ${themes.join(', ')}.`;
      }
    }

    const stylePrompt = ' Style: Clean, professional, modern tech aesthetic with vibrant gradients and contemporary colors. High-quality digital art suitable for a business presentation. No text or logos in the image. Focus on abstract tech concepts, modern UI elements, and innovation. Use a 16:9 aspect ratio composition with depth and visual hierarchy.';
    
    return basePrompt + contextPrompt + stylePrompt;
  }

  /**
   * Download image from URL and save to local filesystem
   */
  private async downloadAndSaveImage(imageUrl: string, campaignId: string): Promise<string> {
    try {
      this.log(`📥 Downloading image from OpenAI for campaign ${campaignId}`);
      
      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Create campaigns directory if it doesn't exist
      const campaignsDir = path.join(process.cwd(), 'public', 'images', 'campaigns');
      await fs.mkdir(campaignsDir, { recursive: true });
      
      // Generate filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const filename = `${campaignId}-${timestamp}.png`;
      const imagePath = path.join(campaignsDir, filename);
      
      // Save the image
      await fs.writeFile(imagePath, buffer);
      
      // Return public URL path
      const publicPath = `/images/campaigns/${filename}`;
      this.log(`💾 Saved image to: ${publicPath}`);
      
      return publicPath;
      
    } catch (error) {
      this.log(`❌ Error downloading/saving image: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      throw new Error(`Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if image generation is available
   */
  static isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  /**
   * Get configuration info for debugging
   */
  getConfig(): {
    isAvailable: boolean;
    hasApiKey: boolean;
    model: string;
    timeout: number;
  } {
    return {
      isAvailable: ImageGenerationService.isAvailable(),
      hasApiKey: !!process.env.OPENAI_API_KEY,
      model: 'dall-e-3',
      timeout: this.config.timeoutMs,
    };
  }
}

export default ImageGenerationService;