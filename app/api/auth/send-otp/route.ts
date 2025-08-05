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

    // First, check if user already exists in the system
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      // User exists - send OTP regardless of waitlist status
      const code = await createOtpCode(existingUser.id);
      const emailSent = await sendOtpEmail(email, code);
      
      if (!emailSent) {
        console.log(`Development mode - OTP code for ${email}: ${code}`);
      }

      return NextResponse.json({ 
        success: true, 
        message: 'OTP code sent to your email',
      });
    }

    // User doesn't exist - check admin settings for new signups
    const settings = await prisma.adminSettings.findFirst();
    const waitlistEnabled = settings?.waitlistEnabled ?? false;
    
    if (waitlistEnabled) {
      // Check if user is on approved waitlist
      const waitlistEntry = await prisma.waitlist.findUnique({
        where: { email: email.toLowerCase() }
      });
      
      if (waitlistEntry) {
        if (waitlistEntry.status === 'approved') {
          // User is approved - create account and send OTP
          const user = await findOrCreateUser(email.toLowerCase());
          const code = await createOtpCode(user.id);
          const emailSent = await sendOtpEmail(email, code);
          
          if (!emailSent) {
            console.log(`Development mode - OTP code for ${email}: ${code}`);
          }

          return NextResponse.json({ 
            success: true, 
            message: 'OTP code sent to your email',
          });
        } else {
          // User is on waitlist but not approved
          return NextResponse.json({ 
            error: 'You\'re already on our waitlist. We\'ll notify you when your account is ready.',
            onWaitlist: true
          }, { status: 403 });
        }
      } else {
        // User not on waitlist - direct to waitlist signup
        return NextResponse.json({ 
          error: 'Signups are currently disabled. Join our waitlist to get notified when accounts become available.',
          needsWaitlist: true
        }, { status: 403 });
      }
    } else {
      // Waitlist disabled - create account normally
      const user = await findOrCreateUser(email.toLowerCase());
      const code = await createOtpCode(user.id);
      const emailSent = await sendOtpEmail(email, code);
      
      if (!emailSent) {
        console.log(`Development mode - OTP code for ${email}: ${code}`);
      }

      return NextResponse.json({ 
        success: true, 
        message: 'OTP code sent to your email',
      });
    }

  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}