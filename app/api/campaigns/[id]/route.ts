import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id },
      include: {
        maker: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        milestones: true,
        pledgeTiers: true,
        stretchGoals: true,
        _count: {
          select: { pledges: true, comments: true }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    
    const {
      title,
      summary,
      description,
      fundingGoalDollars,
      image,
      leadVideoUrl,
      deployModes,
      sectors,
      requireBackerAccount,
      onlyBackersComment,
      milestones,
      stretchGoals,
      priceTiers,
    } = body;

    // Get existing campaign
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id },
      select: { makerId: true, status: true }
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = existingCampaign.makerId === session.user.id;
    const isAdmin = session.user.roles?.includes('admin');
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {};
    
    // Allow full edits for draft campaigns OR if user is admin
    if (existingCampaign.status === 'draft' || isAdmin) {
      if (title !== undefined) updateData.title = title;
      if (summary !== undefined) updateData.summary = summary;
      if (description !== undefined) updateData.description = description;
      if (fundingGoalDollars !== undefined) updateData.fundingGoalDollars = fundingGoalDollars;
      if (image !== undefined) updateData.image = image;
      if (leadVideoUrl !== undefined) updateData.leadVideoUrl = leadVideoUrl;
      if (deployModes !== undefined) updateData.deployModes = deployModes.length > 0 ? deployModes : ["saas"];
      if (sectors !== undefined) updateData.sectors = sectors;
      if (requireBackerAccount !== undefined) updateData.requireBackerAccount = requireBackerAccount;
      if (onlyBackersComment !== undefined) updateData.onlyBackersComment = onlyBackersComment;
    } else {
      // For live campaigns, only allow limited edits
      if (description !== undefined) updateData.description = description;
      if (image !== undefined) updateData.image = image;
      if (leadVideoUrl !== undefined) updateData.leadVideoUrl = leadVideoUrl;
      if (requireBackerAccount !== undefined) updateData.requireBackerAccount = requireBackerAccount;
      if (onlyBackersComment !== undefined) updateData.onlyBackersComment = onlyBackersComment;
    }

    // Handle milestones and stretch goals updates
    if (milestones !== undefined && (existingCampaign.status === 'draft' || isAdmin)) {
      // Delete existing milestones and create new ones
      await prisma.milestone.deleteMany({
        where: { campaignId: resolvedParams.id }
      });

      if (milestones.length > 0) {
        await prisma.milestone.createMany({
          data: milestones.map((milestone: any) => ({
            campaignId: resolvedParams.id,
            name: milestone.name,
            pct: milestone.pct,
            acceptance: milestone.acceptance,
            status: 'pending'
          }))
        });
      }
    }

    if (stretchGoals !== undefined && (existingCampaign.status === 'draft' || isAdmin)) {
      // Delete existing stretch goals and create new ones
      await prisma.stretchGoal.deleteMany({
        where: { campaignId: resolvedParams.id }
      });

      if (stretchGoals.length > 0) {
        await prisma.stretchGoal.createMany({
          data: stretchGoals.map((goal: any, index: number) => ({
            campaignId: resolvedParams.id,
            title: goal.title,
            description: goal.description,
            targetDollars: goal.targetDollars,
            order: goal.order || index + 1
          }))
        });
      }
    }

    if (priceTiers !== undefined && (existingCampaign.status === 'draft' || isAdmin)) {
      // Delete existing price tiers and create new ones
      await prisma.pledgeTier.deleteMany({
        where: { campaignId: resolvedParams.id }
      });

      if (priceTiers.length > 0) {
        await prisma.pledgeTier.createMany({
          data: priceTiers.map((tier: any, index: number) => ({
            campaignId: resolvedParams.id,
            title: tier.title,
            description: tier.description,
            amountDollars: tier.amountDollars,
            benefits: JSON.stringify(tier.benefits || []),
            order: tier.order || index + 1
          }))
        });
      }
    }

    // Update the campaign
    const updatedCampaign = await prisma.campaign.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        maker: {
          select: { id: true, name: true, email: true }
        },
        organization: {
          select: { id: true, name: true }
        },
        milestones: true,
        stretchGoals: { orderBy: { order: 'asc' } },
        pledgeTiers: { orderBy: { order: 'asc' } }
      }
    });

    return NextResponse.json(updatedCampaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    
    // Get existing campaign
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: resolvedParams.id },
      select: { makerId: true, status: true }
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check permissions
    const isOwner = existingCampaign.makerId === session.user.id;
    const isAdmin = session.user.roles?.includes('admin');
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only allow deletion of draft campaigns unless admin
    if (existingCampaign.status !== 'draft' && !isAdmin) {
      return NextResponse.json({ 
        error: 'Cannot delete live campaigns. Contact support if needed.' 
      }, { status: 403 });
    }

    // Delete the campaign
    await prisma.campaign.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}