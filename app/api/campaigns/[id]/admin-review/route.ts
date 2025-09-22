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

    // Check if user is admin
    if (!session.user.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, feedback } = body;

    if (!['approve', 'request_changes'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'request_changes' && !feedback) {
      return NextResponse.json({ 
        error: 'Feedback is required when requesting changes' 
      }, { status: 400 });
    }

    // Find the campaign
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        maker: true,
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.reviewStatus !== 'pending_review') {
      return NextResponse.json({ 
        error: 'Campaign is not pending review' 
      }, { status: 400 });
    }

    // Update campaign based on admin action
    const updateData: any = {
      reviewStatus: action === 'approve' ? 'approved' : 'needs_changes',
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    };

    if (action === 'request_changes') {
      updateData.reviewFeedback = feedback;
    } else {
      updateData.reviewFeedback = null;
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ 
      message: `Campaign ${action === 'approve' ? 'approved' : 'marked for changes'} successfully`,
      campaign: {
        id: updatedCampaign.id,
        reviewStatus: updatedCampaign.reviewStatus,
        reviewFeedback: updatedCampaign.reviewFeedback,
        reviewedAt: updatedCampaign.reviewedAt,
      }
    });

  } catch (error) {
    console.error('Admin review error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
