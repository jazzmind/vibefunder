import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Get organization services
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

    const services = await prisma.organizationService.findMany({
      where: { organizationId },
      include: { category: true },
      orderBy: [
        { isFeatured: 'desc' },
        { order: 'asc' }
      ]
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Add organization service
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: organizationId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions and organization status
    const organization = await prisma.organization.findFirst({
      where: { 
        id: organizationId,
        status: 'approved', // Only approved organizations can add services
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
      return NextResponse.json({ 
        error: 'Organization not found, not approved, or insufficient permissions' 
      }, { status: 404 });
    }

    const body = await request.json();
    const { 
      categoryId,
      title,
      description,
      deliverables,
      pricing,
      estimatedTime,
      prerequisites,
      isActive = true,
      isFeatured = false
    } = body;

    if (!categoryId) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    // Check if service category already exists for this organization
    const existingService = await prisma.organizationService.findUnique({
      where: {
        organizationId_categoryId: {
          organizationId,
          categoryId
        }
      }
    });

    if (existingService) {
      return NextResponse.json({ 
        error: 'Organization already has a service in this category' 
      }, { status: 409 });
    }

    // Verify category exists
    const category = await prisma.serviceCategory.findUnique({
      where: { id: categoryId, isActive: true }
    });

    if (!category) {
      return NextResponse.json({ error: 'Invalid service category' }, { status: 400 });
    }

    const service = await prisma.organizationService.create({
      data: {
        organizationId,
        categoryId,
        title: title || category.name,
        description: description || null,
        deliverables: deliverables || null,
        pricing: pricing || null,
        estimatedTime: estimatedTime || null,
        prerequisites: prerequisites || null,
        isActive,
        isFeatured
      },
      include: {
        category: true
      }
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error adding service:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
