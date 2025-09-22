import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find the campaign and verify ownership
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        maker: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const isOwner = campaign.makerId === session.user.id;
    const isAdmin = session.user.roles?.includes('admin');

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if campaign meets minimum requirements
    if (!campaign.image) {
      return NextResponse.json({ 
        error: 'Campaign must have a lead image before submitting for review' 
      }, { status: 400 });
    }

    if (!campaign.title || !campaign.summary) {
      return NextResponse.json({ 
        error: 'Campaign must have a title and summary before submitting for review' 
      }, { status: 400 });
    }

    // Check if already submitted and pending
    if (campaign.reviewStatus === 'pending_review') {
      return NextResponse.json({ 
        error: 'Campaign is already pending review' 
      }, { status: 400 });
    }

    // Update campaign review status
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        reviewStatus: 'pending_review',
        submittedForReviewAt: new Date(),
        reviewFeedback: null, // Clear previous feedback
        reviewedBy: null,
        reviewedAt: null,
      },
    });

    return NextResponse.json({ 
      message: 'Campaign submitted for review successfully',
      campaign: {
        id: updatedCampaign.id,
        reviewStatus: updatedCampaign.reviewStatus,
        submittedForReviewAt: updatedCampaign.submittedForReviewAt,
      }
    });

  } catch (error) {
    console.error('Submit for review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
