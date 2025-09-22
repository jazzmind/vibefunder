# Email Configuration Setup

## Overview

VibeFunder uses email for OTP (One-Time Password) authentication and various notifications. The application now handles email gracefully in development mode without requiring SMTP configuration.

## Development Mode

When running locally without SMTP configuration, the application will:
- **Display OTP codes in the console** instead of sending emails
- **Continue functioning normally** without email failures
- **Show clear instructions** for setting up real email if needed

### Console Output Example
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 DEVELOPMENT MODE - Email Not Sent
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: user@example.com
Subject: Your VibeFunder Sign-in Code
OTP Code: 625058
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 To enable real email sending:
   1. Add SMTP credentials to .env file
   2. Or use a local mail catcher like MailHog
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Production Email Setup

For production or to test real email sending, configure one of the following options:

### Option 1: Gmail (Recommended for Testing)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App-Specific Password:
   - Go to https://myaccount.google.com/apppasswords
   - Create a new app password for "Mail"
3. Add to `.env`:
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-specific-password"
SMTP_FROM="noreply@vibefunder.ai"
```

### Option 2: SendGrid (Recommended for Production)

1. Sign up for SendGrid: https://sendgrid.com
2. Create an API key
3. Add to `.env`:
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
SMTP_FROM="noreply@vibefunder.ai"
```

### Option 3: Mailgun

1. Sign up for Mailgun: https://www.mailgun.com
2. Get your SMTP credentials
3. Add to `.env`:
```env
SMTP_HOST="smtp.mailgun.org"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="postmaster@your-domain.mailgun.org"
SMTP_PASS="your-mailgun-password"
SMTP_FROM="noreply@vibefunder.ai"
```

### Option 4: Local MailHog (Development Testing)

1. Install MailHog:
```bash
# macOS
brew install mailhog

# Docker
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog

# Linux
go install github.com/mailhog/MailHog@latest
```

2. Start MailHog:
```bash
mailhog
```

3. Add to `.env`:
```env
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_SECURE="false"
SMTP_FROM="noreply@vibefunder.ai"
```

4. View emails at: http://localhost:8025

## Email Types

The application sends the following types of emails:

1. **OTP Authentication** - Sign-in codes for passwordless authentication
2. **Campaign Updates** - Notifications for campaign backers
3. **Waitlist Confirmations** - Confirmation when joining the waitlist
4. **Organization Approvals** - Notifications for approved organizations
5. **Pledge Confirmations** - Receipts for campaign pledges

## Troubleshooting

### Common Issues

1. **ECONNREFUSED error**: No SMTP server running
   - Solution: Application now handles this gracefully in development mode

2. **Authentication failed**: Invalid SMTP credentials
   - Solution: Double-check username/password or API keys

3. **Gmail blocking sign-in**: Security restriction
   - Solution: Use app-specific password, not regular password

4. **Emails going to spam**: Missing SPF/DKIM records
   - Solution: Configure domain authentication with your email provider

### Testing Email Functionality

```bash
# Test email sending after configuration
npm run dev

# Navigate to /signin
# Enter your email
# Check console or email inbox for OTP code
```

## Security Considerations

- **Never commit SMTP credentials** to version control
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Use different credentials for development and production
- Consider using email service webhooks for delivery tracking

## Email Service Comparison

| Service | Free Tier | Best For | Setup Difficulty |
|---------|-----------|----------|-----------------|
| Gmail | 500/day | Development | Easy |
| SendGrid | 100/day | Production | Medium |
| Mailgun | 1000/month | Production | Medium |
| AWS SES | 62,000/month* | High Volume | Hard |
| MailHog | Unlimited | Local Dev | Easy |

*AWS SES requires domain verification

## Next Steps

1. Choose an email service based on your needs
2. Configure environment variables
3. Test email sending functionality
4. Monitor delivery rates and adjust as needed