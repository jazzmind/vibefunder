import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateCampaignImage } from '@/lib/image-generation';

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

    // Generate image using utility function
    const imagePath = await generateCampaignImage({
      id: campaign.id,
      title: campaign.title,
      summary: campaign.summary,
      description: campaign.description || undefined
    });
    
    if (!imagePath) {
      return NextResponse.json({ 
        error: 'Failed to generate image. Please check if OpenAI API key is configured.' 
      }, { status: 500 });
    }

    // Update campaign with new image path
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { image: imagePath }
    });

    return NextResponse.json({ 
      success: true, 
      imagePath
    });

  } catch (error) {
    console.error('❌ Error generating campaign image:', error);
    return NextResponse.json({ 
      error: 'Failed to generate image' 
    }, { status: 500 });
  }
}