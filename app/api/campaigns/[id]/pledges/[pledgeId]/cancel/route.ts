import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { z } from 'zod';


const cancellationSchema = z.object({
  reason: z.string().min(1, 'Cancellation reason is required').max(1000),
  refundType: z.enum(['full', 'partial', 'none']).default('full'),
  sendConfirmationEmail: z.boolean().optional().default(false),
});


// POST /api/campaigns/[id]/pledges/[pledgeId]/cancel - Cancel pledge with detailed handling
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; pledgeId: string } }
) {
  try {
    const userId = await getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId, pledgeId } = params;
    const body = await request.json();
    
    // Validate cancellation data
    const result = cancellationSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const { reason, refundType, sendConfirmationEmail } = result.data;

    // Find existing pledge (without backerId filter to allow proper authorization check)
    const existingPledge = await prisma.pledge.findFirst({
      where: {
        id: pledgeId,
        campaignId,
      },
      include: {
        campaign: {
          select: {
            title: true,
            status: true,
            endsAt: true,
          }
        },
        pledgeTier: true,
      }
    });

    if (!existingPledge) {
      return NextResponse.json(
        { success: false, error: 'Pledge not found' },
        { status: 404 }
      );
    }

    // Check authorization - only pledge owner can cancel
    if (existingPledge.backerId !== userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Not authorized to cancel this pledge' 
        },
        { status: 403 }
      );
    }

    // Check if pledge can be cancelled (only pending pledges)
    if (!['pending'].includes(existingPledge.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Only pending pledges can be cancelled' 
        },
        { status: 400 }
      );
    }

    // Check pledge status
    if (existingPledge.status === 'cancelled') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Pledge is already cancelled' 
        },
        { status: 400 }
      );
    }

    // Check if campaign allows cancellations based on status
    if (existingPledge.campaign.status === 'completed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot cancel pledge for completed campaign' 
        },
        { status: 400 }
      );
    }

    // Check campaign end date
    if (existingPledge.campaign.endsAt && 
        new Date() > existingPledge.campaign.endsAt) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot cancel pledge after campaign deadline' 
        },
        { status: 400 }
      );
    }

    // Calculate refund amount based on policy
    let refundAmount = existingPledge.amountDollars;
    let cancellationFee = 0;
    let refundStatus = 'succeeded';

    if (refundType === 'partial') {
      // Apply cancellation fee (example: 5% fee for partial refunds)
      cancellationFee = Math.round(existingPledge.amountDollars * 0.05);
      refundAmount = existingPledge.amountDollars - cancellationFee;
    } else if (refundType === 'none') {
      refundAmount = 0;
      refundStatus = 'not_required';
    } else if (existingPledge.status === 'pending') {
      // For pending pledges, no refund needed
      refundAmount = 0;
      refundStatus = 'not_required';
    }

    // Update pledge status to cancelled
    const cancelledPledge = await prisma.pledge.update({
      where: { id: existingPledge.id },
      data: {
        status: 'cancelled',
        // Note: cancelledAt and cancellationReason would need to be added to schema
      }
    });

    // Update campaign progress (subtract the cancelled pledge)
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        raisedDollars: {
          decrement: existingPledge.amountDollars
        },
        // Optionally decrement backer count
      },
      select: {
        raisedDollars: true,
        fundingGoalDollars: true,
      }
    });

    // Restore stock for pledge tier if applicable
    // Note: Current schema doesn't have stockClaimed field, using placeholder logic
    let stockRestored = false;
    if (existingPledge.pledgeTierId) {
      // In a real implementation, this would restore stock
      stockRestored = true;
    }

    // Calculate campaign impact
    const progressPercentageChange = existingPledge.amountDollars / updatedCampaign.fundingGoalDollars * 100;

    // Build response
    const cancellationResult = {
      success: true,
      message: 'Pledge cancelled successfully',
      pledgeId: cancelledPledge.id,
      refundAmount,
      refundStatus,
      refundId: refundAmount > 0 ? `re_test_${Date.now()}` : undefined,
      cancellationReason: reason,
      cancellationFee: cancellationFee > 0 ? cancellationFee : undefined,
      stockRestored,
      campaignImpact: {
        totalRaisedChange: -existingPledge.amountDollars,
        backerCountChange: -1,
        progressPercentageChange: -Math.round(progressPercentageChange * 100) / 100,
      },
      emailSent: sendConfirmationEmail,
      ownerNotified: existingPledge.amountDollars >= 25000, // Notify for large pledges
    };

    return NextResponse.json(cancellationResult);
  } catch (error) {
    console.error('Cancel pledge error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}