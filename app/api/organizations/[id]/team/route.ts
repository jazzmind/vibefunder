import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Add team member
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: organizationId } = await params;
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

    const body = await request.json();
    const { 
      email, 
      role = 'member',
      title,
      bio,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      isPubliclyVisible = true
    } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is already a team member
    const existingMember = await prisma.organizationTeamMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a team member' }, { status: 409 });
    }

    const teamMember = await prisma.organizationTeamMember.create({
      data: {
        organizationId,
        userId: user.id,
        role,
        title: title || null,
        bio: bio || null,
        linkedinUrl: linkedinUrl || null,
        githubUrl: githubUrl || null,
        portfolioUrl: portfolioUrl || null,
        isPubliclyVisible
      },
      include: {
        user: true
      }
    });

    return NextResponse.json({ teamMember });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get team members
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: organizationId } = await params;
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
              some: { userId: session.user.id }
            }
          }
        ]
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found or insufficient permissions' }, { status: 404 });
    }

    const teamMembers = await prisma.organizationTeamMember.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ teamMembers });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
