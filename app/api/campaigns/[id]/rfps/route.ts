import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CreateRFPSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  requirements: z.any(), // JSON object with detailed requirements
  budget: z.number().positive().optional(),
  deadline: z.string().optional(), // ISO date string
  serviceCategoryIds: z.array(z.string()).min(1, 'At least one service category is required')
});

// Get RFPs for a campaign
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: campaignId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns the campaign or organization
    const campaign = await prisma.campaign.findFirst({
      where: { 
        id: campaignId,
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
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found or insufficient permissions' }, { status: 404 });
    }

    const rfps = await prisma.rFP.findMany({
      where: { campaignId },
      include: {
        bids: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          },
          orderBy: { submittedAt: 'desc' }
        },
        selectedBid: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          }
        },
        project: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(rfps);
  } catch (error) {
    console.error('Error fetching RFPs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create new RFP from campaign analysis
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: campaignId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns the campaign or organization
    const campaign = await prisma.campaign.findFirst({
      where: { 
        id: campaignId,
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
      },
      include: {
        analysis: true
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found or insufficient permissions' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, requirements, budget, deadline, serviceCategoryIds } = CreateRFPSchema.parse(body);

    // Convert budget to cents if provided
    const budgetInCents = budget ? Math.round(budget * 100) : null;
    const deadlineDate = deadline ? new Date(deadline) : null;

    const rfp = await prisma.rFP.create({
      data: {
        title,
        description,
        requirements,
        budget: budgetInCents,
        deadline: deadlineDate,
        serviceCategoryIds,
        campaignId,
        campaignAnalysisId: campaign.analysis?.id || null
      },
      include: {
        bids: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                logo: true
              }
            }
          }
        },
        campaign: {
          select: {
            id: true,
            title: true
          }
        }
      }
    });

    return NextResponse.json(rfp, { status: 201 });
  } catch (error) {
    console.error('Error creating RFP:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


