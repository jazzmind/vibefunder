import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; memberId: string }>;
}

// Update team member
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: organizationId, memberId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const organization = await prisma.organization.findFirst({
      where: { 
        id: organizationId,
        OR: [
          { ownerId: session.user.id },
          { 
            teamMembers: {
              some: { 
                userId: session.user.id,
                role: { in: ['admin'] }
              }
            }
          }
        ]
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found or insufficient permissions' }, { status: 404 });
    }

    // Check if team member exists
    const teamMember = await prisma.organizationTeamMember.findUnique({
      where: { id: memberId },
      include: { user: true }
    });

    if (!teamMember || teamMember.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      role,
      title,
      bio,
      headshot,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      specialties,
      isPubliclyVisible,
      order
    } = body;

    const updatedTeamMember = await prisma.organizationTeamMember.update({
      where: { id: memberId },
      data: {
        ...(role && { role }),
        ...(title !== undefined && { title }),
        ...(bio !== undefined && { bio }),
        ...(headshot !== undefined && { headshot }),
        ...(linkedinUrl !== undefined && { linkedinUrl }),
        ...(githubUrl !== undefined && { githubUrl }),
        ...(portfolioUrl !== undefined && { portfolioUrl }),
        ...(specialties !== undefined && { specialties }),
        ...(isPubliclyVisible !== undefined && { isPubliclyVisible }),
        ...(order !== undefined && { order })
      },
      include: {
        user: true
      }
    });

    return NextResponse.json({ teamMember: updatedTeamMember });
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Remove team member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: organizationId, memberId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const organization = await prisma.organization.findFirst({
      where: { 
        id: organizationId,
        OR: [
          { ownerId: session.user.id },
          { 
            teamMembers: {
              some: { 
                userId: session.user.id,
                role: { in: ['admin'] }
              }
            }
          }
        ]
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found or insufficient permissions' }, { status: 404 });
    }

    // Check if team member exists
    const teamMember = await prisma.organizationTeamMember.findUnique({
      where: { id: memberId }
    });

    if (!teamMember || teamMember.organizationId !== organizationId) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Prevent removing yourself if you're the only admin
    if (teamMember.userId === session.user.id) {
      const adminCount = await prisma.organizationTeamMember.count({
        where: {
          organizationId,
          role: 'admin'
        }
      });

      const isOwner = organization.ownerId === session.user.id;
      
      if (!isOwner && adminCount <= 1) {
        return NextResponse.json({ 
          error: 'Cannot remove yourself as the only admin. Promote another member to admin first.' 
        }, { status: 400 });
      }
    }

    await prisma.organizationTeamMember.delete({
      where: { id: memberId }
    });

    return NextResponse.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
