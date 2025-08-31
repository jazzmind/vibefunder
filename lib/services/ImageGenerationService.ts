import { z } from 'zod';
import AIService, { AIResult } from '@/lib/ai/aiService';
import { MODELS } from '@/lib/ai/models';

// Input validation schema
const ImageGenerationInputSchema = z.object({
  id: z.string().min(1, 'Campaign ID is required').max(100, 'Campaign ID too long'),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  summary: z.string().optional(),
  description: z.string().optional(),
});

// Output schema for generated image
const ImageGenerationResponseSchema = z.object({
  image: z.instanceof(Buffer).describe(
    'The generated image buffer'
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
   * Generate a campaign image using GPT-Image-1
   */
  async generateCampaignImage(input: ImageGenerationInput): Promise<AIResult<ImageGenerationResponse>> {
    // Validate input
    const validatedInput = this.validateInput(input, ImageGenerationInputSchema, 'generateCampaignImage');

    try {
      this.log(`🎨 Generating AI image for campaign: ${validatedInput.title}`);
      
      // Generate AI image prompt based on campaign details
      const prompt = this.generateImagePrompt(validatedInput);
      this.log(`📝 Using prompt: ${prompt}`);

      const imageBuffer = await this.generateImage(MODELS.image, prompt, "1024x1024", 1, "medium");
        if (!imageBuffer) {
            throw new Error('No image returned from AI service');
        }
        
        return {
          data: {
            image: imageBuffer,
            prompt: prompt,
          },
          metadata: {
            executionTimeMs: Date.now(), // You may want to track this properly
            retries: 0,
            model: MODELS.image
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
      model: MODELS.image,
      timeout: this.config.timeoutMs,
    };
  }
}

export default ImageGenerationService;