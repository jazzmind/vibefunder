import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const pledgeTierUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  amountDollars: z.number().min(1).optional(),
  benefits: z.array(z.string()).optional(),
  order: z.number().min(1).optional(),
  maxQuantity: z.number().min(1).optional().nullable(),
  isActive: z.boolean().optional()
});

// Helper function to check pledge tier permissions
async function checkPledgeTierPermissions(campaignId: string, tierId: string, userId: string) {
  const pledgeTier = await prisma.pledgeTier.findUnique({
    where: { id: tierId },
    include: {
      campaign: {
        include: {
          organization: true,
          teamMembers: true
        }
      }
    }
  });

  if (!pledgeTier || pledgeTier.campaignId !== campaignId) {
    return { pledgeTier: null, canEdit: false, isAdmin: false };
  }

  // Get user roles
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true }
  });

  const isAdmin = user?.roles?.includes('admin') || false;
  const isOwner = pledgeTier.campaign.makerId === userId;
  const isTeamMember = pledgeTier.campaign.teamMembers.some(tm => tm.userId === userId);
  const isOrgOwner = pledgeTier.campaign.organization?.ownerId === userId;

  const canEdit = isAdmin || isOwner || isTeamMember || isOrgOwner;
  
  return { pledgeTier, canEdit, isAdmin };
}

// GET /api/campaigns/[id]/pledge-tiers/[tierId] - Get specific pledge tier
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tierId: string }> }
) {
  try {
    const { id: campaignId, tierId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pledgeTier, canEdit } = await checkPledgeTierPermissions(campaignId, tierId, session.user.id);
    
    if (!pledgeTier) {
      return NextResponse.json({ error: 'Pledge tier not found' }, { status: 404 });
    }

    // Check if user can view this campaign/pledge tier
    const canView = canEdit || 
      (pledgeTier.campaign.status === 'live');
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(pledgeTier);
  } catch (error) {
    console.error('Error fetching pledge tier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/campaigns/[id]/pledge-tiers/[tierId] - Update pledge tier
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tierId: string }> }
) {
  try {
    const { id: campaignId, tierId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = pledgeTierUpdateSchema.parse(body);

    const { pledgeTier, canEdit, isAdmin } = await checkPledgeTierPermissions(campaignId, tierId, session.user.id);
    
    if (!pledgeTier) {
      return NextResponse.json({ error: 'Pledge tier not found' }, { status: 404 });
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this pledge tier' }, { status: 403 });
    }

    // Some fields can be updated on live campaigns, others only by admin
    const isLiveCampaign = pledgeTier.campaign.status !== 'draft';
    const restrictedFields = ['amountDollars', 'maxQuantity'];
    const hasRestrictedChanges = restrictedFields.some(field => field in validatedData);
    
    if (isLiveCampaign && hasRestrictedChanges && !isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden: Cannot modify pledge tier pricing on live campaigns' 
      }, { status: 403 });
    }

    const updatedPledgeTier = await prisma.pledgeTier.update({
      where: { id: tierId },
      data: {
        ...validatedData,
        amountDollars: validatedData.amountDollars ? Math.round(validatedData.amountDollars) : undefined
      }
    });

    return NextResponse.json(updatedPledgeTier);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating pledge tier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id]/pledge-tiers/[tierId] - Delete pledge tier
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tierId: string }> }
) {
  try {
    const { id: campaignId, tierId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pledgeTier, canEdit, isAdmin } = await checkPledgeTierPermissions(campaignId, tierId, session.user.id);
    
    if (!pledgeTier) {
      return NextResponse.json({ error: 'Pledge tier not found' }, { status: 404 });
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this pledge tier' }, { status: 403 });
    }

    // TODO: Add pledgeTierId field to Pledge model for proper validation
    // For now, skip pledge validation since the field doesn't exist in schema
    // const pledgeCount = await prisma.pledge.count({
    //   where: { pledgeTierId: tierId }
    // });
    // if (pledgeCount > 0 && !isAdmin) {
    //   return NextResponse.json({ 
    //     error: 'Forbidden: Cannot delete pledge tier with existing pledges' 
    //   }, { status: 403 });
    // }

    // Only allow pledge tier deletion on draft campaigns unless admin
    if (pledgeTier.campaign.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden: Cannot delete pledge tiers from live campaigns' 
      }, { status: 403 });
    }

    await prisma.pledgeTier.delete({
      where: { id: tierId }
    });

    return NextResponse.json({ message: 'Pledge tier deleted successfully' });
  } catch (error) {
    console.error('Error deleting pledge tier:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}