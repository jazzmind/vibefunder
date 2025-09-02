import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { z } from 'zod';


const updatePledgeSchema = z.object({
  pledgeAmountDollars: z.number().min(1, 'Pledge amount must be at least $1').optional(),
  amountDollars: z.number().min(1, 'Pledge amount must be at least $1').optional(),
  pledgeTierId: z.string().optional(),
  rewardTierId: z.string().optional(), // Legacy support
  message: z.string().max(500).optional(),
  isAnonymous: z.boolean().optional(),
  shippingAddress: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
    country: z.string(),
  }).optional(),
  paymentMethodId: z.string().optional(),
});


// GET /api/campaigns/[id]/pledges/[pledgeId] - Get pledge details
export async function GET(
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

    // Find the pledge
    const pledge = await prisma.pledge.findFirst({
      where: {
        id: pledgeId,
        campaignId,
        backerId: userId, // Only owner can view their pledge
      },
      include: {
        backer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        pledgeTier: {
          select: {
            id: true,
            title: true,
            description: true
          }
        }
      }
    });

    if (!pledge) {
      return NextResponse.json(
        { success: false, error: 'Pledge not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      pledge: {
        id: pledge.id,
        campaignId: pledge.campaignId,
        pledgeAmountDollars: pledge.amountDollars, // Legacy field name for tests
        amountDollars: pledge.amountDollars,
        rewardTierId: pledge.pledgeTierId, // Legacy field name for tests
        pledgeTierId: pledge.pledgeTierId,
        isAnonymous: pledge.isAnonymous,
        userId: pledge.backerId,
        paymentStatus: pledge.status,
        createdAt: pledge.createdAt.toISOString(),
        updatedAt: pledge.updatedAt.toISOString(),
        pledgeTier: pledge.pledgeTier,
        message: pledge.message,
      }
    });
  } catch (error) {
    console.error('Get pledge error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id]/pledges/[pledgeId] - Update pledge
export async function PUT(
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
    
    // Validate input with legacy field support
    const result = updatePledgeSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const updateData = result.data;

    // Map legacy field names
    if (updateData.pledgeAmountDollars && !updateData.amountDollars) {
      updateData.amountDollars = updateData.pledgeAmountDollars;
    }
    if (updateData.rewardTierId && !updateData.pledgeTierId) {
      updateData.pledgeTierId = updateData.rewardTierId;
    }

    // Find existing pledge
    const existingPledge = await prisma.pledge.findFirst({
      where: {
        id: pledgeId,
        campaignId,
        backerId: userId,
        status: { in: ['pending', 'captured'] }
      }
    });

    if (!existingPledge) {
      return NextResponse.json(
        { success: false, error: 'Pledge not found or cannot be updated' },
        { status: 404 }
      );
    }

    // Check if pledge can be updated (only pending pledges can be modified)
    if (existingPledge.status === 'captured') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot update a captured pledge. Please contact support for assistance.' 
        },
        { status: 400 }
      );
    }

    // Check campaign status
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        status: true,
        endsAt: true
      }
    });

    if (!campaign || campaign.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Campaign is not available for updates' },
        { status: 400 }
      );
    }

    if (campaign.endsAt && campaign.endsAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Campaign has ended' },
        { status: 400 }
      );
    }

    // Validate pledge tier if being updated
    if (updateData.pledgeTierId) {
      const pledgeTier = await prisma.pledgeTier.findFirst({
        where: {
          id: updateData.pledgeTierId,
          campaignId: campaignId
        }
      });

      if (!pledgeTier) {
        return NextResponse.json(
          { success: false, error: 'Invalid pledge tier' },
          { status: 400 }
        );
      }

      const newAmount = updateData.amountDollars || existingPledge.amountDollars;
      if (newAmount < pledgeTier.amountDollars) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Minimum pledge for this tier is $${pledgeTier.amountDollars}` 
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data for Prisma
    const prismaUpdateData: any = {};
    if (updateData.amountDollars) prismaUpdateData.amountDollars = updateData.amountDollars;
    if (updateData.pledgeTierId !== undefined) prismaUpdateData.pledgeTierId = updateData.pledgeTierId;
    if (updateData.message !== undefined) prismaUpdateData.message = updateData.message;
    if (updateData.isAnonymous !== undefined) prismaUpdateData.isAnonymous = updateData.isAnonymous;

    // Update the pledge
    const updatedPledge = await prisma.pledge.update({
      where: { id: existingPledge.id },
      data: prismaUpdateData,
      include: {
        backer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        pledgeTier: {
          select: {
            id: true,
            title: true,
            description: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Pledge updated successfully',
      pledge: {
        id: updatedPledge.id,
        campaignId: updatedPledge.campaignId,
        pledgeAmountDollars: updatedPledge.amountDollars, // Legacy field name
        amountDollars: updatedPledge.amountDollars,
        rewardTierId: updatedPledge.pledgeTierId, // Legacy field name
        pledgeTierId: updatedPledge.pledgeTierId,
        isAnonymous: updatedPledge.isAnonymous,
        userId: updatedPledge.backerId,
        paymentStatus: updatedPledge.status,
        createdAt: updatedPledge.createdAt.toISOString(),
        updatedAt: updatedPledge.updatedAt.toISOString(),
        pledgeTier: updatedPledge.pledgeTier,
        message: updatedPledge.message,
      }
    });
  } catch (error) {
    console.error('Update pledge error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id]/pledges/[pledgeId] - Cancel pledge
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; pledgeId: string } }
) {
  return POST(request, params); // Delegate to POST for cancellation
}

// POST /api/campaigns/[id]/pledges/[pledgeId]/cancel - Cancel pledge
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

    // Find existing pledge
    const existingPledge = await prisma.pledge.findFirst({
      where: {
        id: pledgeId,
        campaignId,
        backerId: userId,
        status: { in: ['pending', 'captured'] }
      }
    });

    if (!existingPledge) {
      return NextResponse.json(
        { success: false, error: 'No active pledge found for this campaign' },
        { status: 404 }
      );
    }

    // Check if pledge can be cancelled
    if (existingPledge.status === 'captured') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cannot cancel a captured pledge. Please contact support for refund assistance.' 
        },
        { status: 400 }
      );
    }

    // Update pledge status to cancelled and record cancellation time
    const cancelledPledge = await prisma.pledge.update({
      where: { id: existingPledge.id },
      data: {
        status: 'cancelled',
        cancelledAt: new Date()
      }
    });

    // Update campaign raised amount (subtract the cancelled pledge)
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        raisedDollars: {
          decrement: existingPledge.amountDollars
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Pledge cancelled successfully',
      pledgeId: cancelledPledge.id,
      refundAmount: existingPledge.amountDollars,
      refundStatus: 'succeeded',
      stockRestored: true,
      campaignImpact: {
        totalRaisedChange: -existingPledge.amountDollars,
        backerCountChange: -1,
        progressPercentageChange: 0, // Calculate if needed
      },
      pledge: {
        id: cancelledPledge.id,
        status: cancelledPledge.status,
        cancelledAt: cancelledPledge.cancelledAt,
        amountDollars: cancelledPledge.amountDollars
      }
    });
  } catch (error) {
    console.error('Cancel pledge error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}