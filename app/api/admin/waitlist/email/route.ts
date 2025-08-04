import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { sendCustomWaitlistEmail } from '@/lib/email';

// Send custom email to waitlist users
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.roles?.includes('admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { subject, content, recipients } = body;

    if (!subject || !content) {
      return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
    }

    let emailList: string[] = [];

    if (recipients === 'all') {
      const waitlistEntries = await prisma.waitlist.findMany({
        select: { email: true }
      });
      emailList = waitlistEntries.map(entry => entry.email);
    } else if (recipients === 'pending') {
      const waitlistEntries = await prisma.waitlist.findMany({
        where: { status: 'pending' },
        select: { email: true }
      });
      emailList = waitlistEntries.map(entry => entry.email);
    } else if (Array.isArray(recipients)) {
      emailList = recipients;
    } else {
      return NextResponse.json({ error: 'Invalid recipients' }, { status: 400 });
    }

    // Send emails (in production, consider using a queue for large lists)
    const results = await Promise.allSettled(
      emailList.map(email => sendCustomWaitlistEmail(email, subject, content))
    );

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.length - successful;

    return NextResponse.json({
      message: `Email sent to ${successful} recipients`,
      successful,
      failed,
      total: results.length
    });
  } catch (error) {
    console.error('Error sending custom waitlist email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}