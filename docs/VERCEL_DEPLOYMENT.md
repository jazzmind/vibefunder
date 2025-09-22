# VibeFunder Vercel Deployment Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Stripe Configuration](#stripe-configuration)
- [AWS S3 Setup](#aws-s3-setup)
- [Deployment Process](#deployment-process)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)
- [CI/CD Integration](#cicd-integration)

## Prerequisites

### Required Accounts
- [ ] Vercel account (free tier works)
- [ ] GitHub account with repository access
- [ ] PostgreSQL database (Vercel Postgres, Supabase, or Neon)
- [ ] Stripe account (test mode for development)
- [ ] AWS account (for S3 storage)

### Local Requirements
- Node.js 18+ installed
- npm or yarn package manager
- Git configured
- Vercel CLI (optional): `npm i -g vercel`

## Quick Start

### 1. One-Click Deploy (Recommended for First Time)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jazzmind/vibefunder&env=DATABASE_URL,BETTER_AUTH_SECRET,STRIPE_SECRET_KEY&envDescription=Required%20environment%20variables&envLink=https://github.com/jazzmind/vibefunder/blob/main/.env.example)

### 2. Manual Deploy via CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project name? vibefunder
# - In which directory is your code? ./
# - Want to override settings? No
```

## Detailed Setup

### Step 1: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import from GitHub:
   - Connect GitHub account if not connected
   - Select `jazzmind/vibefunder` repository
   - Click "Import"

### Step 2: Configure Build Settings

Vercel should auto-detect Next.js. Verify these settings:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node.js Version**: 18.x or 20.x

### Step 3: Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `BETTER_AUTH_SECRET` | 32-character random string | Generate with: `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Production URL | `https://vibefunder.vercel.app` |

#### Stripe Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `STRIPE_SECRET_KEY` | Secret API key | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Webhook endpoint secret | After creating webhook endpoint |
| `STRIPE_PRICE_DOLLARS` | Campaign price in cents | `2000000` (for $20,000) |
| `STRIPE_CURRENCY` | Currency code | `usd` |
| `STRIPE_APPLICATION_FEE_BPS` | Fee in basis points | `500` (5%) |
| `STRIPE_DESTINATION_ACCOUNT_ID` | Platform account ID | Stripe Dashboard → Settings |

#### AWS S3 Variables

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | IAM access key | AWS IAM Console |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key | AWS IAM Console |
| `S3_BUCKET` | Bucket name | AWS S3 Console |
| `S3_SIGNED_URL_TTL_SEC` | URL expiry in seconds | `900` (15 minutes) |

## Database Setup

### Option 1: Vercel Postgres (Recommended)
1. In Vercel Dashboard → Storage → Create Database
2. Select "Postgres"
3. Choose region close to your deployment
4. Database URL automatically added to env vars

### Option 2: Supabase
1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database
3. Copy connection string (use "Connection pooling" URL)
4. Add `?pgbouncer=true` to connection string

### Option 3: Neon
1. Create project at [neon.tech](https://neon.tech)
2. Copy connection string from dashboard
3. Ensure SSL is enabled

### Run Database Migrations
After setting up database:
```bash
# Set DATABASE_URL locally
export DATABASE_URL="your-connection-string"

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optional) Seed database
npm run seed
```

## Stripe Configuration

### 1. Create Stripe Webhook Endpoint
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint:
   - URL: `https://your-domain.vercel.app/api/webhooks/stripe`
   - Events to listen:
     - `checkout.session.completed`
     - `payment_intent.succeeded`
     - `payment_intent.failed`
3. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

### 2. Test Mode vs Production
- Start with test keys (prefix: `sk_test_`)
- Switch to live keys only after testing
- Update webhook endpoints for production

## AWS S3 Setup

### 1. Create S3 Bucket
```bash
aws s3 mb s3://vibefunder-artifacts --region us-east-1
```

### 2. Configure Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::vibefunder-artifacts/*"
    }
  ]
}
```

### 3. Create IAM User
1. AWS Console → IAM → Users → Add User
2. Attach policy: `AmazonS3FullAccess` (or custom policy)
3. Create access key
4. Add credentials to Vercel env vars

## Deployment Process

### Initial Deployment
```bash
# Using Vercel CLI
vercel --prod

# Or git push (if connected)
git push origin main
```

### Deployment Checks
1. **Build Logs**: Check for errors in Vercel dashboard
2. **Function Logs**: Monitor API routes
3. **Database Connection**: Test auth and data fetching
4. **Stripe Integration**: Test payment flow
5. **S3 Upload**: Test file uploads

## Post-Deployment

### 1. Domain Configuration
1. Go to Project Settings → Domains
2. Add custom domain
3. Follow DNS configuration instructions
4. SSL certificate auto-provisioned

### 2. Performance Optimization
```json
// Add to vercel.json for caching
{
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 3. Monitoring Setup
1. Enable Vercel Analytics (free tier available)
2. Set up error tracking (Sentry integration)
3. Configure uptime monitoring

## Troubleshooting

### Common Issues and Solutions

#### Build Failures
```bash
# Issue: Module not found
Solution: Check package.json dependencies
npm install missing-package

# Issue: TypeScript errors
Solution: Run type check locally
npm run typecheck
```

#### Database Connection Issues
```bash
# Issue: Connection timeout
Solution: Check DATABASE_URL format
- Ensure ?sslmode=require for production
- Use connection pooling URL if available

# Issue: Migration failures
Solution: Run migrations manually
npx prisma migrate deploy --preview-feature
```

#### Environment Variable Issues
```bash
# Issue: Variables not loading
Solution: Verify in Vercel dashboard
- Check variable names (exact match)
- Ensure no trailing spaces
- Redeploy after changes
```

#### Stripe Webhook Failures
```bash
# Issue: Webhook signature verification failed
Solution:
- Verify STRIPE_WEBHOOK_SECRET matches
- Check request body parsing
- Ensure raw body access in API route
```

### Debug Commands
```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Check environment
vercel env ls

# Rollback deployment
vercel rollback
```

## CI/CD Integration

### GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Type check
        run: npm run typecheck

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Preview Deployments
- Every PR gets a preview deployment
- Comment with deployment URL
- Automatic cleanup after merge

## Production Checklist

### Before Going Live
- [ ] All environment variables set correctly
- [ ] Database migrations run successfully
- [ ] Stripe webhook endpoint configured
- [ ] S3 bucket permissions verified
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Error tracking enabled
- [ ] Analytics configured
- [ ] Rate limiting implemented
- [ ] Security headers configured
- [ ] CORS settings verified
- [ ] Database backups configured
- [ ] Monitoring alerts set up

### Performance Targets
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Core Web Vitals passing

## Useful Commands

```bash
# View all deployments
vercel ls

# Promote to production
vercel promote [deployment-url]

# Remove deployment
vercel rm [deployment-url]

# Check domain status
vercel domains ls

# Inspect deployment
vercel inspect [deployment-url]

# Pull environment variables
vercel env pull

# Set environment variable
vercel env add SECRET_KEY production

# View function logs
vercel logs --follow
```

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel Support](https://vercel.com/support)
- [Community Forum](https://github.com/vercel/next.js/discussions)

## DevOps Agent Integration

For advanced deployment scenarios, utilize these specialized agents from the `/agents` directory:

- **devops-cicd-specialist**: Handles CI/CD pipeline optimization
- **deployment-fiasco-forecaster**: Predicts and prevents deployment issues
- **environment-config-integration-specialist**: Manages complex env configurations
- **nextjs-15-specialist**: Optimizes Next.js 15 specific features
- **database-migration-specialist**: Handles database schema changes
- **performance-optimization-agent**: Post-deployment performance tuning

Invoke agents using the claude-flow CLI:
```bash
npx claude-flow@alpha agent spawn devops-cicd-specialist \
  --task "Optimize Vercel deployment pipeline"
```

---

**Last Updated**: 2024
**Version**: 1.0.0
**Maintained By**: VibeFunder DevOps Team