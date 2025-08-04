import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const passkeysCount = await prisma.passkey.count({
      where: { userId }
    });

    return NextResponse.json({ 
      hasPasskeys: passkeysCount > 0,
      count: passkeysCount 
    });
  } catch (error) {
    console.error('User passkeys check error:', error);
    return NextResponse.json(
      { error: 'Failed to check passkeys' },
      { status: 500 }
    );
  }
}