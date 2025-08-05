import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const stretchGoalUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  targetDollars: z.number().min(1).optional(),
  order: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['pending', 'active', 'achieved']).optional()
});

// Helper function to check stretch goal permissions
async function checkStretchGoalPermissions(campaignId: string, goalId: string, userId: string) {
  const stretchGoal = await prisma.stretchGoal.findUnique({
    where: { id: goalId },
    include: {
      campaign: {
        include: {
          organization: true,
          teamMembers: true
        }
      }
    }
  });

  if (!stretchGoal || stretchGoal.campaignId !== campaignId) {
    return { stretchGoal: null, canEdit: false, isAdmin: false };
  }

  // Get user roles
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true }
  });

  const isAdmin = user?.roles?.includes('admin') || false;
  const isOwner = stretchGoal.campaign.makerId === userId;
  const isTeamMember = stretchGoal.campaign.teamMembers.some(tm => tm.userId === userId);
  const isOrgOwner = stretchGoal.campaign.organization?.ownerId === userId;

  const canEdit = isAdmin || isOwner || isTeamMember || isOrgOwner;
  
  return { stretchGoal, canEdit, isAdmin };
}

// GET /api/campaigns/[id]/stretch-goals/[goalId] - Get specific stretch goal
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  try {
    const { id: campaignId, goalId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stretchGoal, canEdit } = await checkStretchGoalPermissions(campaignId, goalId, session.user.id);
    
    if (!stretchGoal) {
      return NextResponse.json({ error: 'Stretch goal not found' }, { status: 404 });
    }

    // Check if user can view this campaign/stretch goal
    const canView = canEdit || 
      (stretchGoal.campaign.status === 'live');
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(stretchGoal);
  } catch (error) {
    console.error('Error fetching stretch goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/campaigns/[id]/stretch-goals/[goalId] - Update stretch goal
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  try {
    const { id: campaignId, goalId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = stretchGoalUpdateSchema.parse(body);

    const { stretchGoal, canEdit, isAdmin } = await checkStretchGoalPermissions(campaignId, goalId, session.user.id);
    
    if (!stretchGoal) {
      return NextResponse.json({ error: 'Stretch goal not found' }, { status: 404 });
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this stretch goal' }, { status: 403 });
    }

    // Validate stretch goal target if being updated
    if (validatedData.targetDollars && validatedData.targetDollars <= stretchGoal.campaign.fundingGoalDollars) {
      return NextResponse.json({ 
        error: 'Stretch goal target must exceed campaign funding goal' 
      }, { status: 400 });
    }

    // Some fields can be updated on live campaigns, others only by admin
    const isLiveCampaign = stretchGoal.campaign.status !== 'draft';
    const restrictedFields = ['targetDollars'];
    const hasRestrictedChanges = restrictedFields.some(field => field in validatedData);
    
    if (isLiveCampaign && hasRestrictedChanges && !isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden: Cannot modify stretch goal targets on live campaigns' 
      }, { status: 403 });
    }

    const updatedStretchGoal = await prisma.stretchGoal.update({
      where: { id: goalId },
      data: {
        ...validatedData,
        targetDollars: validatedData.targetDollars ? Math.round(validatedData.targetDollars) : undefined
      }
    });

    return NextResponse.json(updatedStretchGoal);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating stretch goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id]/stretch-goals/[goalId] - Delete stretch goal
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; goalId: string }> }
) {
  try {
    const { id: campaignId, goalId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stretchGoal, canEdit, isAdmin } = await checkStretchGoalPermissions(campaignId, goalId, session.user.id);
    
    if (!stretchGoal) {
      return NextResponse.json({ error: 'Stretch goal not found' }, { status: 404 });
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this stretch goal' }, { status: 403 });
    }

    // Only allow stretch goal deletion on draft campaigns unless admin
    if (stretchGoal.campaign.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden: Cannot delete stretch goals from live campaigns' 
      }, { status: 403 });
    }

    await prisma.stretchGoal.delete({
      where: { id: goalId }
    });

    return NextResponse.json({ message: 'Stretch goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting stretch goal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}