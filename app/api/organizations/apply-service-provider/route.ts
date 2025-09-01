import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// Apply to become a service provider
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, services = [] } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Check if user owns or manages the organization
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
      return NextResponse.json({ 
        error: 'Organization not found or insufficient permissions' 
      }, { status: 404 });
    }

    // Check if already a service provider
    if (organization.type === 'service_provider') {
      return NextResponse.json({ 
        error: 'Organization is already a service provider' 
      }, { status: 409 });
    }

    // Update organization to service provider and reset status to pending
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        type: 'service_provider',
        status: 'pending'
      }
    });

    // Add services if provided
    if (services.length > 0) {
      for (const serviceData of services) {
        const { categoryId, title, description } = serviceData;
        
        if (categoryId) {
          // Check if service category already exists for this organization
          const existingService = await prisma.organizationService.findUnique({
            where: {
              organizationId_categoryId: {
                organizationId,
                categoryId
              }
            }
          });

          if (!existingService) {
            await prisma.organizationService.create({
              data: {
                organizationId,
                categoryId,
                title: title || '',
                description: description || null,
                isActive: false // Inactive until approved
              }
            });
          }
        }
      }
    }

    return NextResponse.json({ 
      organization: updatedOrganization,
      message: 'Service provider application submitted successfully. Awaiting approval.' 
    });
  } catch (error) {
    console.error('Error applying as service provider:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
