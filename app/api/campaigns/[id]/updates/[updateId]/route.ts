import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; updateId: string }> }
) {
  const { id, updateId } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { title, content, isPublic } = await request.json();

    // Get the update and check permissions
    const update = await prisma.campaignUpdate.findUnique({
      where: { id: updateId },
      include: { 
        campaign: { 
          include: { teamMembers: true } 
        } 
      }
    });

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    if (update.campaignId !== id) {
      return NextResponse.json({ error: 'Update does not belong to this campaign' }, { status: 400 });
    }

    const isOwner = update.campaign.makerId === session.user.id;
    const isTeamMember = update.campaign.teamMembers.some((tm: any) => tm.userId === session.user.id);
    const isAuthor = update.authorId === session.user.id;
    const isAdmin = session.user.roles?.includes('admin') || false;
    
    if (!isOwner && !isTeamMember && !isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update the post
    const updatedPost = await prisma.campaignUpdate.update({
      where: { id: updateId },
      data: {
        title,
        content,
        isPublic
      }
    });

    return NextResponse.json({ success: true, update: updatedPost });
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; updateId: string }> }
) {
  const { id, updateId } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the update and check permissions
    const update = await prisma.campaignUpdate.findUnique({
      where: { id: updateId },
      include: { 
        campaign: { 
          include: { teamMembers: true } 
        } 
      }
    });

    if (!update) {
      return NextResponse.json({ error: 'Update not found' }, { status: 404 });
    }

    if (update.campaignId !== id) {
      return NextResponse.json({ error: 'Update does not belong to this campaign' }, { status: 400 });
    }

    const isOwner = update.campaign.makerId === session.user.id;
    const isTeamMember = update.campaign.teamMembers.some((tm: any) => tm.userId === session.user.id);
    const isAuthor = update.authorId === session.user.id;
    const isAdmin = session.user.roles?.includes('admin') || false;
    
    if (!isOwner && !isTeamMember && !isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the update
    await prisma.campaignUpdate.delete({
      where: { id: updateId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting update:', error);
    return NextResponse.json({ error: 'Failed to delete update' }, { status: 500 });
  }
}
