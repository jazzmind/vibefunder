import nodemailer from 'nodemailer';

// Check if we're in development mode without SMTP config
const isDevelopment = process.env.NODE_ENV !== 'production';
const hasSmtpConfig = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// Create appropriate transporter based on environment
const transporter = !hasSmtpConfig && isDevelopment
  ? nodemailer.createTransport({
      // Use ethereal email for development (catches emails without sending)
      host: 'localhost',
      port: 1025,
      ignoreTLS: true,
      // This will prevent connection errors in dev
      tls: {
        rejectUnauthorized: false
      }
    })
  : nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });

export async function sendOtpEmail(email: string, code: string) {
  const subject = 'Your VibeFunder Sign-in Code';

  // In development without SMTP, just log the code
  if (!hasSmtpConfig && isDevelopment) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 DEVELOPMENT MODE - Email Not Sent');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${email}`);
    console.log(`Subject: ${subject}`);
    console.log(`OTP Code: ${code}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 To enable real email sending:');
    console.log('   1. Add SMTP credentials to .env file');
    console.log('   2. Or use a local mail catcher like MailHog');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return true; // Return true so the flow continues
  }

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6757f5 0%, #9d93ff 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">VibeFunder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Ship the vibe. Not the pitch deck.</p>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px;">Your Sign-in Code</h2>
        <div style="background: white; padding: 20px; border-radius: 8px; border: 2px solid #e2e8f0; margin: 20px 0;">
          <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #6757f5; letter-spacing: 4px;">${code}</span>
        </div>
        <p style="color: #64748b; margin: 16px 0 0 0; font-size: 14px;">This code expires in 10 minutes</p>
      </div>

      <div style="text-align: center; color: #64748b; font-size: 14px;">
        <p>If you didn't request this code, you can safely ignore this email.</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color: #6757f5; text-decoration: none;">Visit VibeFunder</a>
        </p>
      </div>
    </div>
  `;

  const text = `
Your VibeFunder sign-in code is: ${code}

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@vibefunder.ai',
      to: email,
      subject,
      text,
      html,
    });

    console.log(`✓ OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    // In development, still return true but log the error
    if (isDevelopment) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  DEVELOPMENT MODE - Email Failed');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`OTP Code for ${email}: ${code}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return true; // Still return true in dev mode
    }
    return false;
  }
}

interface CampaignUpdateEmailData {
  campaignTitle: string;
  campaignId: string;
  updateTitle: string;
  updateContent: string;
  authorName: string;
  isPublic: boolean;
}

export async function sendCampaignUpdateEmail(email: string, data: CampaignUpdateEmailData) {
  const subject = `${data.campaignTitle}: ${data.updateTitle}`;
  
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6757f5 0%, #9d93ff 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">VibeFunder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Ship the vibe. Not the pitch deck.</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 24px;">${data.updateTitle}</h2>
        <p style="color: #6757f5; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">${data.campaignTitle}</p>
        <p style="color: #64748b; margin: 0 0 24px 0; font-size: 14px;">Update by ${data.authorName}</p>
        
        <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: left;">
          <div style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${data.updateContent}</div>
        </div>
        
        ${!data.isPublic ? `<div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 12px; border-radius: 6px; margin-top: 16px;">
          <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 500;">🔒 This is a backer-only update</p>
        </div>` : ''}
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns/${data.campaignId}/updates" 
           style="display: inline-block; background: #6757f5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View Campaign Updates
        </a>
      </div>
      
      <div style="text-align: center; color: #64748b; font-size: 14px; margin-top: 30px;">
        <p>You're receiving this because you backed this campaign.</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns/${data.campaignId}" style="color: #6757f5; text-decoration: none;">Visit Campaign</a>
        </p>
      </div>
    </div>
  `;

  const text = `
Campaign Update: ${data.updateTitle}
Campaign: ${data.campaignTitle}
By: ${data.authorName}

${data.updateContent}

${!data.isPublic ? '🔒 This is a backer-only update' : ''}

View more updates: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns/${data.campaignId}/updates
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@vibefunder.ai',
      to: email,
      subject,
      text,
      html,
    });
    
    console.log(`✓ Campaign update email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send campaign update email:', error);
    return false;
  }
}

export async function sendWaitlistConfirmationEmail(email: string, reason: string) {
  const subject = 'Welcome to the VibeFunder Waitlist!';
  
  const reasonText = reason === 'back_campaign' ? 'back campaigns' : 'create campaigns';
  
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6757f5 0%, #9d93ff 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">VibeFunder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Ship the vibe. Not the pitch deck.</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px;">You're on the waitlist! 🎉</h2>
        <p style="color: #374151; margin: 0 0 24px 0; font-size: 16px;">Thank you for your interest in joining VibeFunder to <strong>${reasonText}</strong>.</p>
        
        <div style="background: white; padding: 24px; border-radius: 8px; border: 2px solid #6757f5; margin: 20px 0;">
          <p style="color: #374151; margin: 0; font-size: 16px; line-height: 1.6;">
            We're currently in early access and carefully onboarding new users. 
            You'll be notified as soon as your account is approved!
          </p>
        </div>
      </div>
      
      <div style="text-align: center; color: #64748b; font-size: 14px;">
        <p>We'll send you an email when your account is ready.</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color: #6757f5; text-decoration: none;">Visit VibeFunder</a>
        </p>
      </div>
    </div>
  `;

  const text = `
Welcome to the VibeFunder Waitlist!

Thank you for your interest in joining VibeFunder to ${reasonText}.

We're currently in early access and carefully onboarding new users. You'll be notified as soon as your account is approved!

Visit VibeFunder: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@vibefunder.ai',
      to: email,
      subject,
      text,
      html,
    });
    
    console.log(`✓ Waitlist confirmation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send waitlist confirmation email:', error);
    return false;
  }
}

export async function sendWaitlistApprovalEmail(email: string, reason: string) {
  const subject = 'Your VibeFunder Account is Ready!';
  
  const reasonText = reason === 'back_campaign' ? 'back campaigns' : 'create campaigns';
  
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6757f5 0%, #9d93ff 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">VibeFunder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Ship the vibe. Not the pitch deck.</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px;">Welcome to VibeFunder! 🚀</h2>
        <p style="color: #374151; margin: 0 0 24px 0; font-size: 16px;">Your account has been approved and you can now start to <strong>${reasonText}</strong>!</p>
        
        <div style="background: white; padding: 24px; border-radius: 8px; border: 2px solid #10b981; margin: 20px 0;">
          <p style="color: #10b981; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">✅ Account Activated</p>
          <p style="color: #374151; margin: 0; font-size: 16px;">You can now sign in and explore the platform!</p>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signin" 
           style="display: inline-block; background: #6757f5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 12px;">
          Sign In Now
        </a>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns" 
           style="display: inline-block; background: #374151; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Browse Campaigns
        </a>
      </div>
      
      <div style="text-align: center; color: #64748b; font-size: 14px; margin-top: 30px;">
        <p>Welcome to the future of crowdfunding!</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color: #6757f5; text-decoration: none;">Visit VibeFunder</a>
        </p>
      </div>
    </div>
  `;

  const text = `
Your VibeFunder Account is Ready!

Welcome to VibeFunder! Your account has been approved and you can now start to ${reasonText}!

✅ Account Activated

You can now sign in and explore the platform!

Sign in: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/signin
Browse campaigns: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@vibefunder.ai',
      to: email,
      subject,
      text,
      html,
    });
    
    console.log(`✓ Waitlist approval email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send waitlist approval email:', error);
    return false;
  }
}

export async function sendCustomWaitlistEmail(email: string, subject: string, content: string) {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6757f5 0%, #9d93ff 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">VibeFunder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Ship the vibe. Not the pitch deck.</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <div style="background: white; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0; text-align: left;">
          <div style="color: #374151; line-height: 1.6; white-space: pre-wrap;">${content}</div>
        </div>
      </div>
      
      <div style="text-align: center; color: #64748b; font-size: 14px;">
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" style="color: #6757f5; text-decoration: none;">Visit VibeFunder</a>
        </p>
      </div>
    </div>
  `;

  const text = content;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@vibefunder.ai',
      to: email,
      subject,
      text,
      html,
    });
    
    console.log(`✓ Custom waitlist email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send custom waitlist email:', error);
    return false;
  }
}

export async function sendOrganizationApprovalEmail(email: string, organizationName: string) {
  const subject = `${organizationName} Organization Approved!`;
  
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6757f5 0%, #9d93ff 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">VibeFunder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Ship the vibe. Not the pitch deck.</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px;">Organization Approved! 🎉</h2>
        <p style="color: #374151; margin: 0 0 24px 0; font-size: 16px;"><strong>${organizationName}</strong> has been approved to create campaigns on VibeFunder!</p>
        
        <div style="background: white; padding: 24px; border-radius: 8px; border: 2px solid #10b981; margin: 20px 0;">
          <p style="color: #10b981; margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">✅ Organization Activated</p>
          <p style="color: #374151; margin: 0; font-size: 16px;">You can now create and manage campaigns!</p>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns/create" 
           style="display: inline-block; background: #6757f5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 12px;">
          Create Campaign
        </a>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard" 
           style="display: inline-block; background: #374151; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Go to Dashboard
        </a>
      </div>
      
      <div style="text-align: center; color: #64748b; font-size: 14px; margin-top: 30px;">
        <p>Start building amazing campaigns and connect with backers!</p>
      </div>
    </div>
  `;

  const text = `
${organizationName} Organization Approved!

${organizationName} has been approved to create campaigns on VibeFunder!

✅ Organization Activated

You can now create and manage campaigns!

Create campaign: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns/create
Go to dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@vibefunder.ai',
      to: email,
      subject,
      text,
      html,
    });
    
    console.log(`✓ Organization approval email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send organization approval email:', error);
    return false;
  }
}

export async function sendPledgeConfirmationEmail(email: string, data: {
  campaignTitle: string;
  campaignId: string;
  pledgeAmount: number;
  backerName?: string;
}) {
  const subject = `Pledge Confirmation: ${data.campaignTitle}`;
  
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6757f5 0%, #9d93ff 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">VibeFunder</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px;">Ship the vibe. Not the pitch deck.</p>
      </div>
      
      <div style="background: #f8fafc; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h2 style="color: #1e293b; margin: 0 0 16px 0; font-size: 24px;">Pledge Confirmed! 🎉</h2>
        <p style="color: #374151; margin: 0 0 24px 0; font-size: 16px;">Thank you for backing <strong>${data.campaignTitle}</strong></p>
        
        <div style="background: white; padding: 24px; border-radius: 8px; border: 2px solid #10b981; margin: 20px 0;">
          <p style="color: #374151; margin: 0 0 8px 0; font-size: 16px;">Pledge Amount</p>
          <span style="font-size: 32px; font-weight: bold; color: #10b981;">$${data.pledgeAmount.toLocaleString()}</span>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 8px; margin-top: 16px;">
          <p style="color: #92400e; margin: 0; font-size: 14px; font-weight: 500;">💰 Funds held in escrow until milestones are met</p>
        </div>
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns/${data.campaignId}" 
           style="display: inline-block; background: #6757f5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-right: 12px;">
          View Campaign
        </a>
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile" 
           style="display: inline-block; background: #374151; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Manage Pledges
        </a>
      </div>
      
      <div style="text-align: center; color: #64748b; font-size: 14px; margin-top: 30px;">
        <p>Your payment has been processed securely via Stripe.</p>
        <p>You'll receive updates as the campaign progresses toward its milestones.</p>
      </div>
    </div>
  `;

  const text = `
Pledge Confirmation: ${data.campaignTitle}

Thank you ${data.backerName || ''} for backing this campaign!

Pledge Amount: $${data.pledgeAmount.toLocaleString()}

Your funds are held in escrow until milestones are met. You'll receive updates as the campaign progresses.

View campaign: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/campaigns/${data.campaignId}
Manage pledges: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/profile
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@vibefunder.ai',
      to: email,
      subject,
      text,
      html,
    });
    
    console.log(`✓ Pledge confirmation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send pledge confirmation email:', error);
    return false;
  }
}