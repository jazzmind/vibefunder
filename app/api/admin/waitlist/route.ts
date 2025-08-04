import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { sendWaitlistApprovalEmail } from '@/lib/email';

// Get waitlist entries
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

    const waitlistEntries = await prisma.waitlist.findMany({
      where: status !== 'all' ? { status } : undefined,
      include: {
        approver: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const total = await prisma.waitlist.count({
      where: status !== 'all' ? { status } : undefined,
    });

    return NextResponse.json({
      entries: waitlistEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Approve or reject waitlist entry
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

    const waitlistEntry = await prisma.waitlist.update({
      where: { id },
      data: {
        status,
        notes,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      }
    });

    // If approved, send email notification
    if (status === 'approved') {
      await sendWaitlistApprovalEmail(waitlistEntry.email, waitlistEntry.reason);
    }

    return NextResponse.json(waitlistEntry);
  } catch (error) {
    console.error('Error updating waitlist entry:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}