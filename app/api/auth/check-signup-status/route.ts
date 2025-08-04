import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Check if waitlist is enabled (which means signups are disabled)
export async function GET() {
  try {
    const settings = await prisma.adminSettings.findFirst();
    const waitlistEnabled = settings?.waitlistEnabled ?? false;
    const signupsEnabled = !waitlistEnabled; // Signups are enabled when waitlist is disabled

    return NextResponse.json({ signupsEnabled, waitlistEnabled });
  } catch (error) {
    console.error('Error checking signup status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}