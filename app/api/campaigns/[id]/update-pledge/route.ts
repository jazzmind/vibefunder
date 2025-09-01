import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';
import { z } from 'zod';

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
);

const updatePledgeSchema = z.object({
  amountDollars: z.number().min(1, 'Pledge amount must be at least $1').optional(),
  pledgeTierId: z.string().optional(),
  message: z.string().max(500).optional(),
  isAnonymous: z.boolean().optional()
});

async function getUserFromToken(request: NextRequest) {
  let token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    const cookieToken = request.cookies.get('session')?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.sub as string;
    return userId;
  } catch {
    return null;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserFromToken(request);
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const campaignId = params.id;
    const body = await request.json();
    
    // Validate input
    const result = updatePledgeSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError.message },
        { status: 400 }
      );
    }

    const updateData = result.data;

    // Find existing pledge
    const existingPledge = await prisma.pledge.findFirst({
      where: {
        campaignId,
        backerId: userId,
        status: { in: ['pending', 'captured'] }
      }
    });

    if (!existingPledge) {
      return NextResponse.json(
        { success: false, error: 'No pledge found for this campaign' },
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
      if (newAmount < pledgeTier.minAmountDollars) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Minimum pledge for this tier is $${pledgeTier.minAmountDollars}` 
          },
          { status: 400 }
        );
      }
    }

    // Update the pledge
    const updatedPledge = await prisma.pledge.update({
      where: { id: existingPledge.id },
      data: updateData,
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
        amountDollars: updatedPledge.amountDollars,
        currency: updatedPledge.currency,
        status: updatedPledge.status,
        message: updatedPledge.message,
        isAnonymous: updatedPledge.isAnonymous,
        pledgeTier: updatedPledge.pledgeTier,
        updatedAt: updatedPledge.updatedAt
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