import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const stretchGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  targetDollars: z.number().min(1),
  order: z.number().min(1).default(1),
  isUnlocked: z.boolean().default(false)
});

// Helper function to check campaign permissions
async function checkCampaignPermissions(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { 
      organization: true,
      teamMembers: true
    }
  });

  if (!campaign) {
    return { campaign: null, canEdit: false, isAdmin: false };
  }

  // Get user roles
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true }
  });

  const isAdmin = user?.roles?.includes('admin') || false;
  const isOwner = campaign.makerId === userId;
  const isTeamMember = campaign.teamMembers.some(tm => tm.userId === userId);
  const isOrgOwner = campaign.organization?.ownerId === userId;

  const canEdit = isAdmin || isOwner || isTeamMember || isOrgOwner;
  
  return { campaign, canEdit, isAdmin };
}

// GET /api/campaigns/[id]/stretch-goals - List stretch goals for a campaign
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { campaign, canEdit } = await checkCampaignPermissions(campaignId, session.user.id);
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if user can view this campaign
    const canView = canEdit || 
      (campaign.status === 'live');
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stretchGoals = await prisma.stretchGoal.findMany({
      where: { campaignId },
      orderBy: { targetDollars: 'asc' }
    });

    return NextResponse.json(stretchGoals);
  } catch (error) {
    console.error('Error fetching stretch goals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/campaigns/[id]/stretch-goals - Create a new stretch goal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = stretchGoalSchema.parse(body);

    const { campaign, canEdit, isAdmin } = await checkCampaignPermissions(campaignId, session.user.id);
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this campaign' }, { status: 403 });
    }

    // Validate that stretch goal target exceeds campaign funding goal
    if (validatedData.targetDollars <= campaign.fundingGoalDollars) {
      return NextResponse.json({ 
        error: 'Stretch goal target must exceed campaign funding goal' 
      }, { status: 400 });
    }

    // Only allow stretch goal creation on draft or live campaigns (not completed)
    if (campaign.status === 'completed' && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Cannot add stretch goals to completed campaigns' }, { status: 403 });
    }

    const stretchGoal = await prisma.stretchGoal.create({
      data: {
        ...validatedData,
        campaignId,
        targetDollars: Math.round(validatedData.targetDollars)
      }
    });

    return NextResponse.json(stretchGoal, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating stretch goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}