import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface CampaignImageData {
  id: string;
  title: string;
  summary?: string;
  description?: string;
}

export async function generateCampaignImage(campaign: CampaignImageData): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️ OpenAI API key not configured, skipping image generation');
    return null;
  }

  try {
    console.log(`🎨 Generating AI image for campaign: ${campaign.title}`);
    
    // Generate AI image prompt based on campaign details
    const prompt = generateImagePrompt(campaign);
    console.log(`📝 Using prompt: ${prompt}`);

    // Generate image with OpenAI
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data?.[0]?.url;
    
    if (!imageUrl) {
      console.error('❌ No image URL returned from OpenAI');
      return null;
    }

    // Download and save the image
    const imagePath = await downloadAndSaveImage(imageUrl, campaign.id);
    
    console.log(`✅ Generated and saved image for campaign: ${campaign.title}`);
    return imagePath;

  } catch (error) {
    console.error('❌ Error generating campaign image:', error);
    return null;
  }
}

function generateImagePrompt(campaign: CampaignImageData): string {
  // Create a sophisticated prompt based on campaign details
  const basePrompt = `Create a professional, modern hero image for a tech startup campaign titled "${campaign.title}".`;
  
  let contextPrompt = '';
  if (campaign.summary) {
    contextPrompt += ` The campaign is about: ${campaign.summary}`;
  }
  
  if (campaign.description) {
    // Extract key themes from description
    const description = campaign.description.toLowerCase();
    if (description.includes('ai') || description.includes('artificial intelligence')) {
      contextPrompt += ' Focus on AI and machine learning themes.';
    }
    if (description.includes('dashboard') || description.includes('analytics')) {
      contextPrompt += ' Include data visualization and dashboard elements.';
    }
    if (description.includes('mobile') || description.includes('app')) {
      contextPrompt += ' Show mobile and app development themes.';
    }
    if (description.includes('cloud') || description.includes('saas')) {
      contextPrompt += ' Emphasize cloud computing and SaaS concepts.';
    }
    if (description.includes('developer') || description.includes('code')) {
      contextPrompt += ' Include software development and coding themes.';
    }
    if (description.includes('automation') || description.includes('workflow')) {
      contextPrompt += ' Show workflow automation and process optimization.';
    }
  }

  const stylePrompt = ' Style: Clean, professional, modern tech aesthetic with vibrant gradients and contemporary colors. High-quality digital art suitable for a business presentation. No text or logos in the image. Focus on abstract tech concepts and modern UI elements.';
  
  return basePrompt + contextPrompt + stylePrompt;
}

async function downloadAndSaveImage(imageUrl: string, campaignId: string): Promise<string> {
  try {
    // Download the image
    const response = await fetch(imageUrl);
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
    return `/images/campaigns/${filename}`;
    
  } catch (error) {
    console.error('Error downloading/saving image:', error);
    throw new Error('Failed to save image');
  }
}