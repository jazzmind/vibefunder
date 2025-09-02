import {
  sendOtpEmail,
  sendCampaignUpdateEmail,
  sendWaitlistConfirmationEmail,
  sendWaitlistApprovalEmail,
  sendCustomWaitlistEmail,
  sendOrganizationApprovalEmail,
  sendPledgeConfirmationEmail
} from '@/lib/email';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

// Mock console methods
const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

describe('email', () => {
  const originalEnv = process.env;
  let mockTransporter: jest.Mocked<nodemailer.Transporter>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    
    // Set default environment variables
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'test@example.com';
    process.env.SMTP_PASS = 'test-password';
    process.env.SMTP_FROM = 'noreply@vibefunder.ai';
    process.env.NEXT_PUBLIC_APP_URL = 'https://vibefunder.ai';

    // Create mock transporter
    mockTransporter = {
      sendMail: jest.fn()
    } as any;

    mockedNodemailer.createTransporter.mockReturnValue(mockTransporter);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Transporter configuration', () => {
    it('should create transporter with correct SMTP settings', () => {
      // Re-import to trigger transporter creation
      jest.resetModules();
      require('@/lib/email');

      expect(nodemailer.createTransporter).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password'
        }
      });
    });

    it('should handle missing SMTP_USER (no auth)', () => {
      delete process.env.SMTP_USER;
      
      jest.resetModules();
      require('@/lib/email');

      expect(nodemailer.createTransporter).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: undefined
      });
    });

    it('should use default values for missing environment variables', () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_SECURE;
      
      jest.resetModules();
      require('@/lib/email');

      expect(nodemailer.createTransporter).toHaveBeenCalledWith({
        host: 'localhost',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password'
        }
      });
    });

    it('should handle secure SMTP connection', () => {
      process.env.SMTP_SECURE = 'true';
      process.env.SMTP_PORT = '465';
      
      jest.resetModules();
      require('@/lib/email');

      expect(nodemailer.createTransporter).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 465,
        secure: true,
        auth: {
          user: 'test@example.com',
          pass: 'test-password'
        }
      });
    });
  });

  describe('sendOtpEmail', () => {
    it('should send OTP email successfully', async () => {
      const email = 'user@example.com';
      const code = '123456';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendOtpEmail(email, code);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@vibefunder.ai',
        to: email,
        subject: 'Your VibeFunder Sign-in Code',
        text: expect.stringContaining(code),
        html: expect.stringContaining(code)
      });

      expect(consoleSpy).toHaveBeenCalledWith(`✓ OTP email sent to ${email}`);
      expect(result).toBe(true);
    });

    it('should handle email sending failure', async () => {
      const email = 'user@example.com';
      const code = '123456';

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP connection failed'));

      const result = await sendOtpEmail(email, code);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send OTP email:', expect.any(Error));
      expect(result).toBe(false);
    });

    it('should include code in both text and HTML versions', async () => {
      const email = 'user@example.com';
      const code = '987654';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendOtpEmail(email, code);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.text).toContain(code);
      expect(callArgs.html).toContain(code);
    });

    it('should use default from address when SMTP_FROM is not set', async () => {
      delete process.env.SMTP_FROM;
      
      jest.resetModules();
      const { sendOtpEmail: sendOtpEmailDefault } = require('@/lib/email');
      
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendOtpEmailDefault('user@example.com', '123456');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@vibefunder.ai'
        })
      );
    });

    it('should include app URL in email content', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendOtpEmail('user@example.com', '123456');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('https://vibefunder.ai');
    });
  });

  describe('sendCampaignUpdateEmail', () => {
    const campaignData = {
      campaignTitle: 'Test Campaign',
      campaignId: 'campaign_123',
      updateTitle: 'Project Update #1',
      updateContent: 'We have made significant progress on the project.',
      authorName: 'John Doe',
      isPublic: true
    };

    it('should send campaign update email successfully', async () => {
      const email = 'backer@example.com';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendCampaignUpdateEmail(email, campaignData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@vibefunder.ai',
        to: email,
        subject: 'Test Campaign: Project Update #1',
        text: expect.stringContaining(campaignData.updateContent),
        html: expect.stringContaining(campaignData.updateContent)
      });

      expect(result).toBe(true);
    });

    it('should handle private campaign updates', async () => {
      const privateUpdateData = {
        ...campaignData,
        isPublic: false
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendCampaignUpdateEmail('backer@example.com', privateUpdateData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('🔒 This is a backer-only update');
      expect(callArgs.text).toContain('🔒 This is a backer-only update');
    });

    it('should include campaign links in email', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendCampaignUpdateEmail('backer@example.com', campaignData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`/campaigns/${campaignData.campaignId}/updates`);
      expect(callArgs.html).toContain(`/campaigns/${campaignData.campaignId}`);
    });

    it('should handle email sending failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Email delivery failed'));

      const result = await sendCampaignUpdateEmail('backer@example.com', campaignData);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send campaign update email:', expect.any(Error));
      expect(result).toBe(false);
    });
  });

  describe('sendWaitlistConfirmationEmail', () => {
    it('should send waitlist confirmation for campaign creation', async () => {
      const email = 'creator@example.com';
      const reason = 'create_campaign';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendWaitlistConfirmationEmail(email, reason);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@vibefunder.ai',
        to: email,
        subject: 'Welcome to the VibeFunder Waitlist!',
        text: expect.stringContaining('create campaigns'),
        html: expect.stringContaining('create campaigns')
      });

      expect(result).toBe(true);
    });

    it('should send waitlist confirmation for campaign backing', async () => {
      const email = 'backer@example.com';
      const reason = 'back_campaign';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendWaitlistConfirmationEmail(email, reason);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.text).toContain('back campaigns');
      expect(callArgs.html).toContain('back campaigns');
    });

    it('should handle default reason text', async () => {
      const email = 'user@example.com';
      const reason = 'unknown_reason';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendWaitlistConfirmationEmail(email, reason);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.text).toContain('create campaigns'); // Default behavior
      expect(callArgs.html).toContain('create campaigns');
    });
  });

  describe('sendWaitlistApprovalEmail', () => {
    it('should send waitlist approval email', async () => {
      const email = 'approved@example.com';
      const reason = 'create_campaign';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendWaitlistApprovalEmail(email, reason);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@vibefunder.ai',
        to: email,
        subject: 'Your VibeFunder Account is Ready!',
        text: expect.stringContaining('create campaigns'),
        html: expect.stringContaining('create campaigns')
      });

      expect(result).toBe(true);
    });

    it('should include sign in and browse links', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendWaitlistApprovalEmail('approved@example.com', 'back_campaign');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('/signin');
      expect(callArgs.html).toContain('/campaigns');
    });
  });

  describe('sendCustomWaitlistEmail', () => {
    it('should send custom waitlist email', async () => {
      const email = 'custom@example.com';
      const subject = 'Custom Email Subject';
      const content = 'This is custom email content with special information.';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendCustomWaitlistEmail(email, subject, content);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@vibefunder.ai',
        to: email,
        subject,
        text: content,
        html: expect.stringContaining(content)
      });

      expect(result).toBe(true);
    });

    it('should preserve content formatting in HTML', async () => {
      const content = 'Line 1\n\nLine 2 with\nmultiple\nbreaks';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendCustomWaitlistEmail('user@example.com', 'Subject', content);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('white-space: pre-wrap');
      expect(callArgs.html).toContain(content);
    });
  });

  describe('sendOrganizationApprovalEmail', () => {
    it('should send organization approval email', async () => {
      const email = 'org@example.com';
      const organizationName = 'Test Organization';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendOrganizationApprovalEmail(email, organizationName);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@vibefunder.ai',
        to: email,
        subject: 'Test Organization Organization Approved!',
        text: expect.stringContaining(organizationName),
        html: expect.stringContaining(organizationName)
      });

      expect(result).toBe(true);
    });

    it('should include organization-specific links', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendOrganizationApprovalEmail('org@example.com', 'My Org');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('/campaigns/create');
      expect(callArgs.html).toContain('/dashboard');
    });
  });

  describe('sendPledgeConfirmationEmail', () => {
    const pledgeData = {
      campaignTitle: 'Awesome Project',
      campaignId: 'campaign_456',
      pledgeAmount: 100,
      backerName: 'Jane Smith'
    };

    it('should send pledge confirmation email', async () => {
      const email = 'pledger@example.com';

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendPledgeConfirmationEmail(email, pledgeData);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@vibefunder.ai',
        to: email,
        subject: 'Pledge Confirmation: Awesome Project',
        text: expect.stringContaining('$100'),
        html: expect.stringContaining('$100')
      });

      expect(result).toBe(true);
    });

    it('should format large pledge amounts correctly', async () => {
      const largePledgeData = {
        ...pledgeData,
        pledgeAmount: 1000000
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendPledgeConfirmationEmail('pledger@example.com', largePledgeData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('$1,000,000');
      expect(callArgs.text).toContain('$1,000,000');
    });

    it('should handle pledge without backer name', async () => {
      const pledgeDataNoBacker = {
        campaignTitle: 'Test Campaign',
        campaignId: 'campaign_789',
        pledgeAmount: 50
      };

      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const result = await sendPledgeConfirmationEmail('anonymous@example.com', pledgeDataNoBacker);

      expect(result).toBe(true);
      
      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.text).toContain('Thank you  for backing'); // Extra space where name would be
    });

    it('should include campaign and profile links', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendPledgeConfirmationEmail('pledger@example.com', pledgeData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`/campaigns/${pledgeData.campaignId}`);
      expect(callArgs.html).toContain('/profile');
    });

    it('should include escrow information', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendPledgeConfirmationEmail('pledger@example.com', pledgeData);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Funds held in escrow');
      expect(callArgs.text).toContain('held in escrow');
    });
  });

  describe('Email template consistency', () => {
    it('should include VibeFunder branding in all emails', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const emailFunctions = [
        () => sendOtpEmail('test@example.com', '123456'),
        () => sendWaitlistConfirmationEmail('test@example.com', 'create_campaign'),
        () => sendWaitlistApprovalEmail('test@example.com', 'create_campaign'),
        () => sendCustomWaitlistEmail('test@example.com', 'Subject', 'Content'),
        () => sendOrganizationApprovalEmail('test@example.com', 'Test Org')
      ];

      for (const emailFunction of emailFunctions) {
        await emailFunction();
        const callArgs = mockTransporter.sendMail.mock.calls[mockTransporter.sendMail.mock.calls.length - 1][0];
        expect(callArgs.html).toContain('VibeFunder');
        expect(callArgs.html).toContain('Ship the vibe. Not the pitch deck.');
      }
    });

    it('should use consistent color scheme', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendOtpEmail('test@example.com', '123456');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('#6757f5'); // Primary brand color
      expect(callArgs.html).toContain('#9d93ff'); // Secondary brand color
    });
  });

  describe('Error handling', () => {
    it('should handle transporter sendMail throwing synchronous errors', async () => {
      mockTransporter.sendMail.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      const result = await sendOtpEmail('test@example.com', '123456');

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send OTP email:', expect.any(Error));
    });

    it('should handle various email validation scenarios', async () => {
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      const testEmails = [
        'simple@example.com',
        'user.name+tag@example.com',
        'user_name@subdomain.example.com',
        'test123@example.co.uk'
      ];

      for (const email of testEmails) {
        const result = await sendOtpEmail(email, '123456');
        expect(result).toBe(true);
      }
    });
  });

  describe('Environment configuration edge cases', () => {
    it('should handle missing NEXT_PUBLIC_APP_URL', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      
      jest.resetModules();
      const { sendOtpEmail: sendOtpEmailNoUrl } = require('@/lib/email');
      
      mockTransporter.sendMail.mockResolvedValue({ messageId: 'test-message-id' });

      await sendOtpEmailNoUrl('test@example.com', '123456');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('http://localhost:3000');
    });

    it('should handle non-numeric SMTP_PORT', () => {
      process.env.SMTP_PORT = 'invalid-port';
      
      jest.resetModules();
      require('@/lib/email');

      expect(nodemailer.createTransporter).toHaveBeenCalledWith(
        expect.objectContaining({
          port: NaN // parseInt('invalid-port') returns NaN
        })
      );
    });
  });
});