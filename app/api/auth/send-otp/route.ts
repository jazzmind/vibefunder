import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { findOrCreateUser, createOtpCode } from '@/lib/auth';
import { sendOtpEmail } from '@/lib/email';

const sendOtpSchema = z.object({
  email: z.string().email()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = sendOtpSchema.parse(body);

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