import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-helpers';
import { z } from 'zod';

const pledgeSchema = z.object({
  amountDollars: z.number().min(1, 'Pledge amount must be at least $1'),
  pledgeTierId: z.string().optional(),
  message: z.string().max(500).optional(),
  isAnonymous: z.boolean().optional().default(false)
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please login to make a pledge.' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    
    // Validate input
    const result = pledgeSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const { amountDollars, pledgeTierId, message, isAnonymous } = result.data;

    // Check if campaign exists and is active
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        title: true,
        status: true,
        fundingGoalDollars: true,
        raisedDollars: true,
        endsAt: true
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status !== 'published') {
      return NextResponse.json(
        { success: false, error: 'Campaign is not available for pledging' },
        { status: 400 }
      );
    }

    if (campaign.endsAt && campaign.endsAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Campaign has ended' },
        { status: 400 }
      );
    }

    // Validate pledge tier if provided
    if (pledgeTierId) {
      const pledgeTier = await prisma.pledgeTier.findFirst({
        where: {
          id: pledgeTierId,
          campaignId: campaignId
        }
      });

      if (!pledgeTier) {
        return NextResponse.json(
          { success: false, error: 'Invalid pledge tier' },
          { status: 400 }
        );
      }

      if (amountDollars < pledgeTier.amountDollars) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Minimum pledge for this tier is $${pledgeTier.amountDollars}` 
          },
          { status: 400 }
        );
      }
    }

    // Check for existing pledge by this user
    const existingPledge = await prisma.pledge.findFirst({
      where: {
        campaignId,
        backerId: userId,
        status: { in: ['pending', 'captured'] }
      }
    });

    if (existingPledge) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You have already pledged to this campaign. Use update-pledge to modify your pledge.' 
        },
        { status: 409 }
      );
    }

    // Create the pledge
    const pledge = await prisma.pledge.create({
      data: {
        campaignId,
        backerId: userId,
        amountDollars,
        currency: 'USD',
        status: 'pending',
        pledgeTierId,
        message,
        isAnonymous: isAnonymous || false
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

    return NextResponse.json({
      success: true,
      message: 'Pledge created successfully',
      pledge: {
        id: pledge.id,
        amountDollars: pledge.amountDollars,
        currency: pledge.currency,
        status: pledge.status,
        message: pledge.message,
        isAnonymous: pledge.isAnonymous,
        pledgeTier: pledge.pledgeTier,
        createdAt: pledge.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Create pledge error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}