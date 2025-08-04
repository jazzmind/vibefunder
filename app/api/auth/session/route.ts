import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ user: null });
    }

    const session = await verifySession(sessionToken);
    
    if (!session) {
      // Clear invalid session
      cookieStore.delete('session');
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ 
      user: {
        id: session.userId,
        email: session.email,
        roles: session.roles
      }
    });

  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null });
  }
}