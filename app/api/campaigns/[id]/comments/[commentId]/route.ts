import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Get the comment and check permissions
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        campaign: {
          include: { teamMembers: true }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.campaignId !== id) {
      return NextResponse.json({ 
        error: 'Comment does not belong to this campaign' 
      }, { status: 400 });
    }

    // Check permissions (only author, campaign owner, team member, or admin can edit)
    const isAuthor = comment.userId === session.user.id;
    const isOwner = comment.campaign.makerId === session.user.id;
    const isTeamMember = comment.campaign.teamMembers.some((tm: any) => tm.userId === session.user.id);
    const isAdmin = session.user.roles?.includes('admin');

    if (!isAuthor && !isOwner && !isTeamMember && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the comment
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await params;
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the comment and check permissions
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        campaign: {
          include: { teamMembers: true }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    if (comment.campaignId !== id) {
      return NextResponse.json({ 
        error: 'Comment does not belong to this campaign' 
      }, { status: 400 });
    }

    // Check permissions (only author, campaign owner, team member, or admin can delete)
    const isAuthor = comment.userId === session.user.id;
    const isOwner = comment.campaign.makerId === session.user.id;
    const isTeamMember = comment.campaign.teamMembers.some((tm: any) => tm.userId === session.user.id);
    const isAdmin = session.user.roles?.includes('admin');

    if (!isAuthor && !isOwner && !isTeamMember && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the comment (this will cascade to replies)
    await prisma.comment.delete({
      where: { id: commentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
