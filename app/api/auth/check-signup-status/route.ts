import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Check if signups are enabled
export async function GET() {
  try {
    const settings = await prisma.adminSettings.findFirst();
    const signupsEnabled = settings?.signupsEnabled ?? true;

    return NextResponse.json({ signupsEnabled });
  } catch (error) {
    console.error('Error checking signup status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}