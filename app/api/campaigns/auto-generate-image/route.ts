import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ImageGenerationService } from '@/lib/services/ImageGenerationService';
import { AIClient } from '@/lib/aiClient';
import { AIError } from '@/lib/aiService';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaignId } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
    }

    // Get campaign and verify ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { 
        maker: true,
        teamMembers: { include: { user: true } }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if user can edit this campaign
    const isOwner = campaign.makerId === session.user.id;
    const isTeamMember = campaign.teamMembers?.some(tm => tm.userId === session.user.id);
    
    if (!isOwner && !isTeamMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only generate if campaign doesn't already have an image
    if (campaign.image) {
      return NextResponse.json({ 
        message: 'Campaign already has an image',
        hasImage: true,
        imagePath: campaign.image
      });
    }

    // Check if AI is configured - for auto-generation, fail silently
    if (!AIClient.isConfigured()) {
      console.log(`⚠️ Could not auto-generate image for campaign ${campaign.id} (OpenAI API not configured)`);
      return NextResponse.json({ 
        message: 'Image generation skipped - AI service not configured',
        hasImage: false
      });
    }

    // Generate image using the new service
    const service = new ImageGenerationService();
    const result = await service.generateCampaignImage({
      id: campaign.id,
      title: campaign.title,
      summary: campaign.summary || undefined,
      description: campaign.description || undefined
    });

    // Update campaign with new image path
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { image: result.data.imagePath }
    });

    return NextResponse.json({ 
      success: true, 
      imagePath: result.data.imagePath,
      prompt: result.data.prompt,
      message: 'Image generated successfully'
    }, {
      headers: {
        'X-AI-Execution-Time': result.metadata.executionTimeMs.toString(),
        'X-AI-Model': result.metadata.model || 'unknown',
        'X-AI-Retries': result.metadata.retries.toString(),
      }
    });

  } catch (error) {
    console.error('❌ Error in auto image generation:', error);
    
    // For auto-generation, we want to fail silently in most cases
    if (error instanceof AIError) {
      console.log(`⚠️ Auto image generation failed for campaign ${request.url}: ${error.message}`);
      return NextResponse.json({ 
        message: 'Image generation skipped due to AI service error',
        hasImage: false,
        error: error.retryable ? 'Temporary service issue' : 'Service unavailable'
      });
    }
    
    return NextResponse.json({ 
      message: 'Image generation skipped due to unknown error',
      hasImage: false
    });
  }
}