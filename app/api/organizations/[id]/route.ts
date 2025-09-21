import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Get organization details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organization = await prisma.organization.findFirst({
      where: { 
        id,
        OR: [
          { ownerId: session.user.id },
          { 
            teamMembers: {
              some: { userId: session.user.id }
            }
          }
        ]
      },
      include: {
        owner: true,
        teamMembers: {
          include: { user: true },
          orderBy: { order: 'asc' }
        },
        services: {
          include: { category: true },
          orderBy: [
            { isFeatured: 'desc' },
            { order: 'asc' }
          ]
        },
        campaigns: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                pledges: true,
                comments: true,
                milestones: true
              }
            }
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ organization });
  } catch (error) {
    console.error('Error fetching organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update organization
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const organization = await prisma.organization.findFirst({
      where: { 
        id,
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
      name, 
      description, 
      shortDescription,
      website, 
      email, 
      businessType,
      taxId,
      listingVisibility,
      logo,
      portfolioItems
    } = body;

    const updatedOrganization = await prisma.organization.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(shortDescription !== undefined && { shortDescription }),
        ...(website !== undefined && { website }),
        ...(email && { email }),
        ...(businessType !== undefined && { businessType }),
        ...(taxId !== undefined && { taxId }),
        ...(listingVisibility && { listingVisibility }),
        ...(logo !== undefined && { logo }),
        ...(portfolioItems !== undefined && { portfolioItems })
      }
    });

    return NextResponse.json({ organization: updatedOrganization });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete organization (owner only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is owner
    const organization = await prisma.organization.findFirst({
      where: { 
        id,
        ownerId: session.user.id
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found or insufficient permissions' }, { status: 404 });
    }

    // Delete organization (cascading deletes will handle related records)
    await prisma.organization.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Error deleting organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
