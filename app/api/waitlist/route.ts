import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendWaitlistConfirmationEmail } from '@/lib/email';

// Join waitlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, reason } = body;

    if (!email || !reason) {
      return NextResponse.json({ error: 'Email and reason are required' }, { status: 400 });
    }

    if (!['back_campaign', 'create_campaign', 'provide_services'].includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }

    // Check if email is already on waitlist
    const existingEntry = await prisma.waitlist.findUnique({
      where: { email }
    });

    if (existingEntry) {
      return NextResponse.json({ 
        error: 'Email already on waitlist',
        status: existingEntry.status 
      }, { status: 409 });
    }

    // Add to waitlist
    const waitlistEntry = await prisma.waitlist.create({
      data: {
        email,
        reason,
      }
    });

    // Send confirmation email
    await sendWaitlistConfirmationEmail(email, reason);

    return NextResponse.json({ 
      message: 'Successfully added to waitlist',
      id: waitlistEntry.id 
    });
  } catch (error) {
    console.error('Error adding to waitlist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Check waitlist status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    const waitlistEntry = await prisma.waitlist.findUnique({
      where: { email },
      select: { status: true, createdAt: true, approvedAt: true }
    });

    if (!waitlistEntry) {
      return NextResponse.json({ error: 'Email not found on waitlist' }, { status: 404 });
    }

    return NextResponse.json(waitlistEntry);
  } catch (error) {
    console.error('Error checking waitlist status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}