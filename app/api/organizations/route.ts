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
      address 
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
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
        ownerId: session.user.id,
      }
    });

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