import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ImageLibraryService } from '@/lib/services/ImageLibraryService';
import { AIClient } from '@/lib/ai/aiClient';
import { AIError } from '@/lib/ai/aiService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get campaign and verify ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id },
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

    // Check if AI is configured
    if (!AIClient.isConfigured()) {
      return NextResponse.json({ 
        error: 'AI service not configured. Please check your OpenAI API key.' 
      }, { status: 500 });
    }

    // Generate and store image using the library service
    const service = new ImageLibraryService();
    const result = await service.generateAndStoreImage({
      prompt: `Professional hero image for "${campaign.title}". ${campaign.summary || ''}`,
      userId: session.user.id,
      organizationId: campaign.organizationId || undefined,
      campaignTitle: campaign.title,
      theme: 'technology',
      tags: ['campaign', 'hero', 'professional'],
      isPublic: false
    });

    // Update campaign with new image URL
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { image: result.data.blobUrl }
    });

    return NextResponse.json({ 
      success: true, 
      imagePath: result.data.blobUrl,
      imageUrl: result.data.blobUrl,
      prompt: result.data.prompt,
      message: 'Image generated successfully!' 
    }, {
      headers: {
        'X-AI-Execution-Time': result.metadata.executionTimeMs.toString(),
        'X-AI-Model': result.metadata.model || 'unknown',
        'X-AI-Retries': result.metadata.retries.toString(),
      }
    });

  } catch (error) {
    console.error('❌ Error generating campaign image:', error);
    
    if (error instanceof AIError) {
      const statusCode = error.type === 'validation' ? 400 : 
                        error.type === 'rate_limit' ? 429 : 500;
      
      return NextResponse.json({ 
        error: error.message,
        type: error.type,
        retryable: error.retryable 
      }, { status: statusCode });
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate image',
      type: 'unknown_error' 
    }, { status: 500 });
  }
}