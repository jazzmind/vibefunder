import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const milestoneSchema = z.object({
  name: z.string().min(1).max(200),
  pct: z.number().min(1).max(100),
  dueDate: z.string().optional(),
  acceptance: z.object({
    criteria: z.string(),
    deliverables: z.array(z.string()).optional()
  })
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

  // Can edit if admin, owner, team member, or org owner
  // Live campaigns can only be edited by admins for certain operations
  const canEdit = isAdmin || isOwner || isTeamMember || isOrgOwner;
  
  return { campaign, canEdit, isAdmin };
}

// GET /api/campaigns/[id]/milestones - List milestones for a campaign
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

    const milestones = await prisma.milestone.findMany({
      where: { campaignId },
      orderBy: { pct: 'asc' }
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/campaigns/[id]/milestones - Create a new milestone
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
    const validatedData = milestoneSchema.parse(body);

    const { campaign, canEdit, isAdmin } = await checkCampaignPermissions(campaignId, session.user.id);
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this campaign' }, { status: 403 });
    }

    // Only allow milestone creation on draft campaigns unless admin
    if (campaign.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Cannot add milestones to live campaigns' }, { status: 403 });
    }

    const milestone = await prisma.milestone.create({
      data: {
        ...validatedData,
        campaignId,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null
      }
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating milestone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}