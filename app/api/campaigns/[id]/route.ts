import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const updateCampaignSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  fundingGoalDollars: z.number().min(1).max(10000000).optional(),
  budgetDollars: z.number().min(1).max(10000000).optional(),
  status: z.enum(['draft', 'published', 'paused', 'completed', 'cancelled']).optional(),
  image: z.string().optional()
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const item = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id },
      include: {
        milestones: {
          orderBy: { createdAt: 'asc' }
        },
        pledgeTiers: {
          where: { isActive: true },
          orderBy: { order: 'asc' }
        },
        maker: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        _count: {
          select: {
            pledges: true,
            comments: true
          }
        }
      }
    });
    
    if (!item) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    
    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await req.json();
    const validatedData = updateCampaignSchema.parse(body);

    // Verify campaign ownership
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id },
      include: {
        organization: true
      }
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if user owns the campaign directly or through organization
    const isOwner = existingCampaign.makerId === session.user.id;
    const isOrgOwner = existingCampaign.organization?.ownerId === session.user.id;
    
    if (!isOwner && !isOrgOwner) {
      return NextResponse.json({ error: 'Forbidden: You do not own this campaign' }, { status: 403 });
    }

    const item = await prisma.campaign.update({
      where: { id: resolvedParams.id },
      data: validatedData,
      include: {
        milestones: true,
        pledgeTiers: true,
        maker: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
