# Vercel Deployment Fix Guide

## Problem
Error: Environment Variable "DATABASE_URL" references Secret "database_url", which does not exist.

## Root Cause
The `vercel.json` file references Vercel secrets using the `@secret_name` syntax, but these secrets haven't been created in your Vercel project.

## Solution

### Option 1: Add Secrets via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Add each secret
vercel secrets add database_url "postgresql://user:password@<unique-identifier>.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
vercel secrets add better_auth_secret "your-32-byte-secret-here"
vercel secrets add next_public_app_url "https://your-domain.vercel.app"
vercel secrets add stripe_secret_key "sk_test_your_key"
vercel secrets add stripe_webhook_secret "whsec_your_secret"
vercel secrets add stripe_price_dollars "2000000"
vercel secrets add stripe_currency "usd"
vercel secrets add stripe_application_fee_bps "500"
vercel secrets add stripe_destination_account_id "acct_your_id"
vercel secrets add aws_region "us-east-1"
vercel secrets add aws_access_key_id "your_aws_key"
vercel secrets add aws_secret_access_key "your_aws_secret"
vercel secrets add s3_bucket "vibefunder-artifacts"
vercel secrets add s3_signed_url_ttl_sec "900"
```

### Option 2: Add Environment Variables via Vercel Dashboard

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings** → **Environment Variables**
3. Add each environment variable:

| Key | Value | Environment |
|-----|-------|-------------|
| DATABASE_URL | Your PostgreSQL connection string | Production, Preview, Development |
| BETTER_AUTH_SECRET | 32-byte random secret | Production, Preview, Development |
| NEXT_PUBLIC_APP_URL | https://your-domain.vercel.app | Production, Preview, Development |
| STRIPE_SECRET_KEY | sk_test_... | Production, Preview, Development |
| STRIPE_WEBHOOK_SECRET | whsec_... | Production, Preview, Development |
| STRIPE_PRICE_DOLLARS | 2000000 | Production, Preview, Development |
| STRIPE_CURRENCY | usd | Production, Preview, Development |
| STRIPE_APPLICATION_FEE_BPS | 500 | Production, Preview, Development |
| STRIPE_DESTINATION_ACCOUNT_ID | acct_... | Production, Preview, Development |
| AWS_REGION | us-east-1 | Production, Preview, Development |
| AWS_ACCESS_KEY_ID | Your AWS key | Production, Preview, Development |
| AWS_SECRET_ACCESS_KEY | Your AWS secret | Production, Preview, Development |
| S3_BUCKET | vibefunder-artifacts | Production, Preview, Development |
| S3_SIGNED_URL_TTL_SEC | 900 | Production, Preview, Development |

### Option 3: Simplified vercel.json (Recommended)

Remove the `@secret_name` references from `vercel.json` and let Vercel automatically use environment variables:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  },
  "build": {
    "env": {
      "NODE_ENV": "production",
      "SKIP_ENV_VALIDATION": "true"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "regions": ["iad1"]
}
```

## Deployment Steps

1. Choose one of the options above (Option 3 is recommended)
2. If using Option 3, update your `vercel.json` file
3. Add all environment variables via Vercel Dashboard
4. Deploy using:
   ```bash
   vercel --prod
   ```
   or push to your Git repository to trigger automatic deployment

## Security Notes

- Never commit actual secrets to Git
- Use `.env.local` for local development
- Use Vercel's environment variables for production
- Rotate secrets regularly
- Use different secrets for production vs development

## Verification

After deployment, verify:
1. Check deployment logs for any errors
2. Test database connection
3. Verify all API endpoints work
4. Test Stripe integration
5. Verify S3 file uploads