import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { z } from "zod";

const milestoneUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  pct: z.number().min(1).max(100).optional(),
  dueDate: z.string().optional().nullable(),
  acceptance: z.object({
    criteria: z.string(),
    deliverables: z.array(z.string()).optional()
  }).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'approved']).optional()
});

// Helper function to check milestone permissions
async function checkMilestonePermissions(campaignId: string, milestoneId: string, userId: string) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      campaign: {
        include: {
          organization: true,
          teamMembers: true
        }
      }
    }
  });

  if (!milestone || milestone.campaignId !== campaignId) {
    return { milestone: null, canEdit: false, isAdmin: false };
  }

  // Get user roles
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true }
  });

  const isAdmin = user?.roles?.includes('admin') || false;
  const isOwner = milestone.campaign.makerId === userId;
  const isTeamMember = milestone.campaign.teamMembers.some(tm => tm.userId === userId);
  const isOrgOwner = milestone.campaign.organization?.ownerId === userId;

  const canEdit = isAdmin || isOwner || isTeamMember || isOrgOwner;
  
  return { milestone, canEdit, isAdmin };
}

// GET /api/campaigns/[id]/milestones/[milestoneId] - Get specific milestone
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: campaignId, milestoneId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { milestone, canEdit } = await checkMilestonePermissions(campaignId, milestoneId, session.user.id);
    
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    // Check if user can view this campaign/milestone
    const canView = canEdit || 
      (milestone.campaign.status === 'live');
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error('Error fetching milestone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/campaigns/[id]/milestones/[milestoneId] - Update milestone
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: campaignId, milestoneId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = milestoneUpdateSchema.parse(body);

    const { milestone, canEdit, isAdmin } = await checkMilestonePermissions(campaignId, milestoneId, session.user.id);
    
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to edit this milestone' }, { status: 403 });
    }

    // Some fields can be updated on live campaigns, others only by admin
    const isLiveCampaign = milestone.campaign.status !== 'draft';
    const restrictedFields = ['name', 'pct', 'acceptance'];
    const hasRestrictedChanges = restrictedFields.some(field => field in validatedData);
    
    if (isLiveCampaign && hasRestrictedChanges && !isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden: Cannot modify milestone structure on live campaigns' 
      }, { status: 403 });
    }

    const updatedMilestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...validatedData,
        dueDate: validatedData.dueDate ? 
          (validatedData.dueDate === null ? null : new Date(validatedData.dueDate)) : 
          undefined
      }
    });

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data', details: error.errors }, { status: 400 });
    }
    console.error('Error updating milestone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/campaigns/[id]/milestones/[milestoneId] - Delete milestone
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const { id: campaignId, milestoneId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { milestone, canEdit, isAdmin } = await checkMilestonePermissions(campaignId, milestoneId, session.user.id);
    
    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
    }

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this milestone' }, { status: 403 });
    }

    // Only allow milestone deletion on draft campaigns unless admin
    if (milestone.campaign.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ 
        error: 'Forbidden: Cannot delete milestones from live campaigns' 
      }, { status: 403 });
    }

    await prisma.milestone.delete({
      where: { id: milestoneId }
    });

    return NextResponse.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}