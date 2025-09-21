import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { calculatePlatformFee } from '@/lib/services/ServiceProviderMetrics';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CreateBidSchema = z.object({
  proposedPrice: z.number().positive('Proposed price must be positive'),
  feeIncluded: z.boolean().default(false),
  estimatedDays: z.number().positive().optional(),
  proposal: z.string().min(50, 'Proposal must be at least 50 characters'),
  milestones: z.any().optional() // JSON object with proposed milestones
});

// Get bids for an RFP
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: rfpId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view bids (campaign owner or admin)
    const rfp = await prisma.rFP.findFirst({
      where: { 
        id: rfpId,
        campaign: {
          OR: [
            { makerId: session.user.id },
            {
              organization: {
                OR: [
                  { ownerId: session.user.id },
                  {
                    teamMembers: {
                      some: {
                        userId: session.user.id,
                        role: { in: ['admin'] }
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      }
    });

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found or insufficient permissions' }, { status: 404 });
    }

    const bids = await prisma.bid.findMany({
      where: { rfpId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true,
            shortDescription: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });

    return NextResponse.json(bids);
  } catch (error) {
    console.error('Error fetching bids:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Submit a bid for an RFP
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: rfpId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's service provider organization
    const organization = await prisma.organization.findFirst({
      where: {
        ownerId: session.user.id,
        type: 'service_provider',
        status: 'approved'
      }
    });

    if (!organization) {
      return NextResponse.json({ 
        error: 'You must be an approved service provider to submit bids' 
      }, { status: 403 });
    }

    // Check if RFP exists and is open
    const rfp = await prisma.rFP.findFirst({
      where: { 
        id: rfpId,
        status: 'open'
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    if (!rfp) {
      return NextResponse.json({ error: 'RFP not found or not open for bidding' }, { status: 404 });
    }

    // Check if organization already has a bid for this RFP
    const existingBid = await prisma.bid.findUnique({
      where: {
        rfpId_organizationId: {
          rfpId,
          organizationId: organization.id
        }
      }
    });

    if (existingBid) {
      return NextResponse.json({ 
        error: 'You have already submitted a bid for this RFP' 
      }, { status: 409 });
    }

    const body = await request.json();
    const { proposedPrice, feeIncluded, estimatedDays, proposal, milestones } = CreateBidSchema.parse(body);

    // Convert proposed price to cents
    const proposedPriceCents = Math.round(proposedPrice * 100);

    // Calculate platform fee and provider earnings
    const feeCalculation = calculatePlatformFee(proposedPriceCents, feeIncluded);

    const bid = await prisma.bid.create({
      data: {
        rfpId,
        organizationId: organization.id,
        proposedPrice: feeCalculation.proposedPrice,
        platformFee: feeCalculation.platformFee,
        providerEarnings: feeCalculation.providerEarnings,
        feeIncluded,
        estimatedDays,
        proposal,
        milestones
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            logo: true,
            shortDescription: true
          }
        },
        rfp: {
          select: {
            id: true,
            title: true,
            campaign: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      bid,
      pricing: {
        proposedPrice: feeCalculation.proposedPrice / 100,
        platformFee: feeCalculation.platformFee / 100,
        providerEarnings: feeCalculation.providerEarnings / 100,
        clientPays: feeCalculation.clientPays / 100,
        feeIncluded
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating bid:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
