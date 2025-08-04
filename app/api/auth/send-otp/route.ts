import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findOrCreateUser, createOtpCode } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';
import { prisma } from '@/lib/db';

const sendOtpSchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = sendOtpSchema.parse(body);

    // Check admin settings first
    const settings = await prisma.adminSettings.findFirst();
    const signupsEnabled = settings?.signupsEnabled ?? true;
    
    if (!signupsEnabled) {
      // Check if user is on approved waitlist
      const waitlistEntry = await prisma.waitlist.findUnique({
        where: { email: email.toLowerCase() }
      });
      
      if (!waitlistEntry || waitlistEntry.status !== 'approved') {
        return NextResponse.json({ 
          error: 'Signups are currently disabled. Join our waitlist to get notified when your account is ready.',
          needsWaitlist: true
        }, { status: 403 });
      }
    }

    // Find or create user
    const user = await findOrCreateUser(email.toLowerCase());
    
    // Generate OTP code
    const code = await createOtpCode(user.id);
    
    // Send email
    const emailSent = await sendOtpEmail(email, code);
    
    if (!emailSent) {
      console.log(`Development mode - OTP code for ${email}: ${code}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'OTP code sent to your email',
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}