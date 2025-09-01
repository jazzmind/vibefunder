# VibeFunder — Next.js MVP (with Stripe & S3)

[![Test Coverage CI/CD](https://github.com/nateaune/vibefunder/actions/workflows/test.yml/badge.svg)](https://github.com/nateaune/vibefunder/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/nateaune/vibefunder/branch/main/graph/badge.svg?token=YOUR_TOKEN_HERE)](https://codecov.io/gh/nateaune/vibefunder)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)

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

## GitHub App (recommended)
- `GH_APP_ID` – GitHub App ID
- `GH_APP_PRIVATE_KEY` – PEM contents (escape newlines as \n in .env)
- `GH_APP_INSTALL_URL` – e.g., https://github.com/apps/<app-slug>/installations/new

Connect flow:
- Frontend links to `/api/github/app/start?redirect_to=/analyzer`.
- After install, callback exchanges `installation_id` for an installation token stored as `gh_installation_token` cookie.

## Analyzer API (server-to-server)
- `ANALYZER_BASE_URL` – e.g., http://localhost:8080 or your Koyeb URL
- `ANALYZER_CLIENT_ID` – client id configured on analyzer service
- `ANALYZER_CLIENT_SECRET` – client secret configured on analyzer service

Usage:
- Start analysis via `POST /api/analyzer/start` with `{ repo_url, branch? }`.
- Status at `GET /api/analyzer/jobs/:jobId`.
- SoW at `GET /api/analyzer/jobs/:jobId/sow`.
