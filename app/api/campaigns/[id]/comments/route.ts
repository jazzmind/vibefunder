import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const updateId = url.searchParams.get('updateId');
    const itemType = url.searchParams.get('itemType') || 'campaign';
    const itemId = url.searchParams.get('itemId');

    // Build where clause based on parameters
    const whereClause: any = {
      campaignId: id,
      parentId: null, // Only get top-level comments
    };

    // Add specific item filters
    if (updateId) {
      whereClause.updateId = updateId;
      whereClause.itemType = 'update';
    } else if (itemId && itemType) {
      whereClause.itemId = itemId;
      whereClause.itemType = itemType;
    } else {
      // Default to campaign-level comments
      whereClause.updateId = null;
      whereClause.itemId = null;
      whereClause.itemType = 'campaign';
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content, parentId, updateId, itemType = 'campaign', itemId } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Get campaign to check permissions
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        teamMembers: true,
        pledges: { where: { backerId: session.user.id } }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Check if user can comment
    const isOwner = campaign.makerId === session.user.id;
    const isTeamMember = campaign.teamMembers.some((tm: any) => tm.userId === session.user.id);
    const isBacker = campaign.pledges.length > 0;
    const isAdmin = session.user.roles?.includes('admin');

    // Allow comments if: owner, team member, backer, admin, or campaign allows all comments
    const canComment = isOwner || isTeamMember || isBacker || isAdmin || !campaign.onlyBackersComment;

    if (!canComment) {
      return NextResponse.json({ 
        error: 'Only backers can comment on this campaign' 
      }, { status: 403 });
    }

    // Create the comment
    const comment = await prisma.comment.create({
      data: {
        campaignId: id,
        userId: session.user.id,
        content: content.trim(),
        parentId: parentId || null,
        updateId: updateId || null,
        itemType,
        itemId: itemId || null,
        isTeamMember: isOwner || isTeamMember
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
