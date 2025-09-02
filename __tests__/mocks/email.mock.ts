/**
 * Email Service Mock for Integration Tests
 * Provides realistic email behavior without sending actual emails
 */

import { jest } from '@jest/globals';

// Track sent emails
export const sentEmails: Array<{
  to: string;
  subject: string;
  html: string;
  timestamp: Date;
}> = [];

// Mock email templates
export const emailTemplates = {
  welcome: {
    subject: 'Welcome to VibeFunder!',
    html: '<h1>Welcome!</h1><p>Thanks for joining VibeFunder.</p>',
  },
  emailVerification: {
    subject: 'Verify Your Email Address',
    html: '<h1>Verify Email</h1><p>Click the link to verify: <a href="{verifyUrl}">Verify</a></p>',
  },
  otpCode: {
    subject: 'Your Verification Code',
    html: '<h1>Verification Code</h1><p>Your code is: <strong>{code}</strong></p>',
  },
  campaignPublished: {
    subject: 'Your Campaign is Live!',
    html: '<h1>Campaign Published</h1><p>Your campaign "{title}" is now live!</p>',
  },
  pledgeConfirmation: {
    subject: 'Pledge Confirmed',
    html: '<h1>Pledge Confirmed</h1><p>Thank you for pledging ${amount} to "{campaign}"!</p>',
  },
  pledgeReceived: {
    subject: 'New Pledge Received',
    html: '<h1>New Pledge</h1><p>You received a ${amount} pledge for "{campaign}"!</p>',
  },
  passwordReset: {
    subject: 'Reset Your Password',
    html: '<h1>Reset Password</h1><p>Click to reset: <a href="{resetUrl}">Reset</a></p>',
  },
};

// Mock nodemailer transporter
export const mockTransporter = {
  sendMail: jest.fn().mockImplementation((mailOptions) => {
    // Store the email
    sentEmails.push({
      to: mailOptions.to,
      subject: mailOptions.subject,
      html: mailOptions.html,
      timestamp: new Date(),
    });
    
    // Return a promise that resolves to success
    return Promise.resolve({
      messageId: `msg_${Date.now()}`,
      response: '250 Message accepted',
      accepted: [mailOptions.to],
      rejected: [],
    });
  }),
  
  verify: jest.fn().mockResolvedValue(true),
};

// Helper functions for tests
export function getLastEmail() {
  return sentEmails[sentEmails.length - 1];
}

export function getEmailsTo(email: string) {
  return sentEmails.filter(e => e.to === email);
}

export function getEmailsBySubject(subject: string) {
  return sentEmails.filter(e => e.subject.includes(subject));
}

export function clearSentEmails() {
  sentEmails.length = 0;
}

export function resetEmailMocks() {
  clearSentEmails();
  mockTransporter.sendMail.mockClear();
  mockTransporter.verify.mockClear();
}

// Mock email sending function
export const mockSendEmail = jest.fn().mockImplementation(
  async (to: string, subject: string, html: string) => {
    sentEmails.push({
      to,
      subject,
      html,
      timestamp: new Date(),
    });
    
    return {
      messageId: `msg_${Date.now()}`,
      accepted: [to],
      rejected: [],
    };
  }
);

// Mock specific email functions
export const mockSendWelcomeEmail = jest.fn().mockImplementation(
  async (email: string, name: string) => {
    return mockSendEmail(
      email,
      emailTemplates.welcome.subject,
      emailTemplates.welcome.html.replace('{name}', name)
    );
  }
);

export const mockSendEmailVerification = jest.fn().mockImplementation(
  async (email: string, verifyUrl: string) => {
    return mockSendEmail(
      email,
      emailTemplates.emailVerification.subject,
      emailTemplates.emailVerification.html.replace('{verifyUrl}', verifyUrl)
    );
  }
);

export const mockSendOtpCode = jest.fn().mockImplementation(
  async (email: string, code: string) => {
    return mockSendEmail(
      email,
      emailTemplates.otpCode.subject,
      emailTemplates.otpCode.html.replace('{code}', code)
    );
  }
);

export const mockSendPledgeConfirmation = jest.fn().mockImplementation(
  async (email: string, amount: number, campaignTitle: string) => {
    return mockSendEmail(
      email,
      emailTemplates.pledgeConfirmation.subject,
      emailTemplates.pledgeConfirmation.html
        .replace('{amount}', amount.toString())
        .replace('{campaign}', campaignTitle)
    );
  }
);

// Simulate email failures for testing
export function simulateEmailFailure() {
  mockTransporter.sendMail.mockRejectedValueOnce(
    new Error('Email service temporarily unavailable')
  );
}

export function simulateEmailDelay(ms: number = 2000) {
  mockTransporter.sendMail.mockImplementationOnce((mailOptions) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        sentEmails.push({
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
          timestamp: new Date(),
        });
        resolve({
          messageId: `msg_${Date.now()}`,
          response: '250 Message accepted (delayed)',
          accepted: [mailOptions.to],
          rejected: [],
        });
      }, ms);
    });
  });
}

// Export default configuration
export default {
  transporter: mockTransporter,
  sendEmail: mockSendEmail,
  sendWelcome: mockSendWelcomeEmail,
  sendVerification: mockSendEmailVerification,
  sendOtp: mockSendOtpCode,
  sendPledgeConfirmation: mockSendPledgeConfirmation,
  sentEmails,
  getLastEmail,
  getEmailsTo,
  getEmailsBySubject,
  clearSentEmails,
  reset: resetEmailMocks,
  simulateFailure: simulateEmailFailure,
  simulateDelay: simulateEmailDelay,
};
