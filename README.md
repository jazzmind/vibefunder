# VibeFunder — Next.js MVP (with Stripe & S3)

## Setup
1. `npm install`
2. `cp .env.example .env` and set values
3. `npx prisma migrate dev --name init` && `npm run seed`
4. `npm run dev`

## Stripe
- Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`.
- Optional Connect: `STRIPE_DESTINATION_ACCOUNT_ID`, `STRIPE_APPLICATION_FEE_BPS` (bps = 500 => 5%).
- Configure webhook to `POST /api/stripe/webhook` for `checkout.session.completed`.

## S3
- Set `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`.
- Use the campaign page uploader to PUT artifacts via pre-signed URLs.
