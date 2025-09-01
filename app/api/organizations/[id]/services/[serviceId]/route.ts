import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; serviceId: string }>;
}

// Get service details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: organizationId, serviceId } = await params;
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

    const service = await prisma.organizationService.findFirst({
      where: { 
        id: serviceId,
        organizationId
      },
      include: {
        category: true
      }
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update service
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: organizationId, serviceId } = await params;
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

    // Check if service exists and belongs to organization
    const existingService = await prisma.organizationService.findFirst({
      where: { 
        id: serviceId,
        organizationId
      }
    });

    if (!existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const body = await request.json();
    const { 
      title,
      description,
      deliverables,
      pricing,
      estimatedTime,
      prerequisites,
      isActive,
      isFeatured,
      order
    } = body;

    const updatedService = await prisma.organizationService.update({
      where: { id: serviceId },
      data: {
        // Only update fields that are provided - handle empty strings as null
        ...(title !== undefined && { title: title?.trim() || null }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(estimatedTime !== undefined && { estimatedTime: estimatedTime?.trim() || null }),
        ...(deliverables !== undefined && { deliverables }),
        ...(pricing !== undefined && { pricing }),
        ...(prerequisites !== undefined && { prerequisites }),
        ...(isActive !== undefined && { isActive }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(order !== undefined && { order })
      },
      include: {
        category: true
      }
    });

    return NextResponse.json({ service: updatedService });
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Delete service
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: organizationId, serviceId } = await params;
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

    // Check if service exists and belongs to organization
    const existingService = await prisma.organizationService.findFirst({
      where: { 
        id: serviceId,
        organizationId
      }
    });

    if (!existingService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await prisma.organizationService.delete({
      where: { id: serviceId }
    });

    return NextResponse.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
