import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateCampaignImage } from '@/lib/image-generation';

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

    // Generate image using utility function
    const imagePath = await generateCampaignImage({
      id: campaign.id,
      title: campaign.title,
      summary: campaign.summary,
      description: campaign.description || undefined
    });
    
    if (!imagePath) {
      // Don't return error for auto-generation, just log it
      console.log(`⚠️ Could not auto-generate image for campaign ${campaign.id} (OpenAI API may not be configured)`);
      return NextResponse.json({ 
        message: 'Image generation skipped',
        hasImage: false
      });
    }

    // Update campaign with new image path
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { image: imagePath }
    });

    return NextResponse.json({ 
      success: true, 
      imagePath,
      message: 'Image generated successfully'
    });

  } catch (error) {
    console.error('❌ Error in auto image generation:', error);
    return NextResponse.json({ 
      error: 'Failed to generate image',
      message: 'Auto-generation failed'
    }, { status: 500 });
  }
}