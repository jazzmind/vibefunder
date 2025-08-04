import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { sendOrganizationApprovalEmail } from '@/lib/email';

// Get organization applications
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const organizations = await prisma.organization.findMany({
      where: status !== 'all' ? { status } : undefined,
      include: {
        owner: {
          select: { id: true, name: true, email: true }
        },
        approver: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.organization.count({
      where: status !== 'all' ? { status } : undefined,
    });

    return NextResponse.json({
      organizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Approve or reject organization
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, notes } = body;

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        status,
        notes,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
      include: {
        owner: {
          select: { email: true }
        }
      }
    });

    // If approved, send email notification
    if (status === 'approved') {
      await sendOrganizationApprovalEmail(organization.owner.email, organization.name);
    }

    return NextResponse.json(organization);
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}