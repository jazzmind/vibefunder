import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const pledgeTierSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  amountDollars: z.number().min(1),
  benefits: z.array(z.string()).default([]),
  order: z.number().min(1).default(1),
  maxQuantity: z.number().min(1).optional(),
  isActive: z.boolean().default(true)
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

// GET /api/campaigns/[id]/pledge-tiers - List pledge tiers for a campaign
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

    const pledgeTiers = await prisma.pledgeTier.findMany({
      where: { campaignId },
      orderBy: { amountDollars: 'asc' }
    });

    return NextResponse.json(pledgeTiers);
  } catch (error) {
    console.error('Error fetching pledge tiers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/campaigns/[id]/pledge-tiers - Create a new pledge tier
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
    const validatedData = pledgeTierSchema.parse(body);

    const { campaign, canEdit, isAdmin } = await checkCampaignPermissions(campaignId, session.user.id);
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this campaign' }, { status: 403 });
    }

    // Only allow pledge tier creation on draft campaigns unless admin
    if (campaign.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Cannot add pledge tiers to live campaigns' }, { status: 403 });
    }

    const pledgeTier = await prisma.pledgeTier.create({
      data: {
        ...validatedData,
        campaignId,
        amountDollars: Math.round(validatedData.amountDollars)
      }
    });

    return NextResponse.json(pledgeTier, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('Error creating pledge tier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}