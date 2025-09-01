import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret'
);

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

export async function POST(
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Alias DELETE to POST for consistency
  return POST(request, { params });
}