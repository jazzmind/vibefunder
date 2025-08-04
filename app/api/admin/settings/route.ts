import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

// Get admin settings
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    let settings = await prisma.adminSettings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist
      settings = await prisma.adminSettings.create({
        data: {
          waitlistEnabled: false,
          organizationApprovalRequired: true,
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching admin settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Update admin settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { waitlistEnabled, organizationApprovalRequired } = body;

    let settings = await prisma.adminSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.adminSettings.create({
        data: {
          waitlistEnabled: waitlistEnabled ?? false,
          organizationApprovalRequired: organizationApprovalRequired ?? true,
          updatedBy: session.user.id,
        }
      });
    } else {
      settings = await prisma.adminSettings.update({
        where: { id: settings.id },
        data: {
          waitlistEnabled,
          organizationApprovalRequired,
          updatedBy: session.user.id,
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating admin settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}