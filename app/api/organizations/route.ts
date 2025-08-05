import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// Create organization
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      website, 
      email, 
      businessType, 
      taxId, 
      address,
      type = 'creator',
      shortDescription,
      listingVisibility = 'public',
      services = []
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Validate service provider requirements
    if (type === 'service_provider') {
      if (!shortDescription) {
        return NextResponse.json({ error: 'Short description is required for service providers' }, { status: 400 });
      }
      if (!services || services.length === 0) {
        return NextResponse.json({ error: 'At least one service category is required for service providers' }, { status: 400 });
      }
    }

    // Check if user already has a pending or approved organization
    const existingOrg = await prisma.organization.findFirst({
      where: {
        ownerId: session.user.id,
        status: { in: ['pending', 'approved'] }
      }
    });

    if (existingOrg) {
      return NextResponse.json({ 
        error: 'You already have an organization application',
        status: existingOrg.status 
      }, { status: 409 });
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        description,
        website,
        email,
        businessType,
        taxId,
        address,
        type,
        shortDescription,
        listingVisibility,
        ownerId: session.user.id,
      }
    });

    // Create service relationships for service providers
    if (type === 'service_provider' && services.length > 0) {
      const serviceData = services.map((categoryId: string) => ({
        organizationId: organization.id,
        categoryId,
        title: '', // Will be filled in later by the organization
        isActive: true
      }));

      await prisma.organizationService.createMany({
        data: serviceData
      });
    }

    return NextResponse.json({ 
      message: 'Organization created successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status
      }
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Get user's organizations
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizations = await prisma.organization.findMany({
      where: { ownerId: session.user.id },
      include: {
        approver: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}