# VibeFunder.ai — Platform Planning Doc (Updated)

Last updated: August 07, 2025

## 1) Vision
A marketplace where makers raise milestone-funded capital from early customers to turn prototypes into reliable products. Platform earns a platform fee and margins on partner services.

## 2) Roles & Permissions
- Maker (Founder): create/edit campaign, connect repo, upload artifacts, request review, publish.
- Backer (Customer): pledge funds, review evidence, accept/holdback milestones.
- Partner (Vendor): create profile, list services, accept work orders (post-MVP), upload deliverables.
- Admin: approvals (makers/partners), config, moderation.
- Auditor (optional): read-only evidence access.

## 3) Current Product Scope (MVP)
Implemented now:
- Campaign creation wizard with two paths: GitHub repository or manual
- GitHub connect and repo analysis (README/docs) with AI campaign generation
- Auto-creation of campaign with milestones and pledge tiers from AI output
- Service provider profile generation from domain via web research (returns structured draft; DB create pending)
- Image auto-generation for new campaigns (hero image)
- Basic payments scaffolding (Stripe integration present; milestone ledger not implemented)

Out of scope for MVP (kept for v1):
- Full escrow ledger implementation
- Work orders and invoicing
- Advanced badges program and evidence vault
- Organization SSO/SAML and KYC/KYB

## 4) Core Objects (as implemented)
- Campaign: id, maker_id, title, summary, description, funding_goal_dollars, status (draft|published), repoUrl, videoUrl?, image?, deployModes[], sectors[], endsAt?, createdAt/updatedAt
- Milestone: id, campaign_id, name, pct, dueDate?, acceptance (json), status, evidence (json[]) default []
- PledgeTier: id, campaign_id, title, description, amountDollars, order
- StretchGoal: id, campaign_id, title, description, isUnlocked, amountDollars
- Comment, TeamMember, CampaignUpdate (existing models)
- GitHubConnection: id, userId, githubToken, username?, isActive, timestamps

Note: Service Provider entity exists conceptually; auto-generation returns a draft. DB model and create flow can be added next.

## 5) Key Flows
Maker (Campaign):
1) Sign in → choose “Create campaign”
2) Wizard: select GitHub vs Manual
3) If GitHub: paste repo URL (+ optional PAT for private); system verifies, reads README/docs; AI generates campaign, milestones, pledge tiers; auto-create campaign (draft); redirect to edit page; optional auto-image generation
4) If Manual: fill core fields; create draft; edit as needed
5) Request review → Admin publish (MVP: simple publish toggle)

Partner (Service Provider):
1) Join waitlist → Admin approves → enter domain → AI generates draft profile (returned to UI); user edits and saves (DB create to be added) → request review → publish

Backer (Customer):
- Browse campaigns, pledge tiers (checkout flow present; milestone capture policy defined below)

## 6) Data Model (DDL sketch aligned to implementation)
```sql
-- Postgres (sketch; matches Prisma models at high level)
create table users(
  id uuid primary key, email text unique, roles text[], created_at timestamptz default now()
);
create table campaigns(
  id uuid primary key, maker_id uuid references users(id), title text, summary text,
  description text, funding_goal_dollars int, currency text default 'USD', status text,
  repo_url text, video_url text, image text, deploy_modes text[], sectors text[],
  ends_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table milestones(
  id uuid primary key, campaign_id uuid references campaigns(id), name text, pct int,
  due_date timestamptz, acceptance jsonb, status text default 'pending', evidence jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
create table pledge_tiers(
  id uuid primary key, campaign_id uuid references campaigns(id), title text, description text,
  amount_dollars int, "order" int
);
create table stretch_goals(
  id uuid primary key, campaign_id uuid references campaigns(id), title text, description text,
  is_unlocked bool default false, amount_dollars int
);
create table github_connections(
  id uuid primary key, user_id uuid references users(id), github_token text, username text,
  is_active bool default true, created_at timestamptz default now(), updated_at timestamptz default now()
);
```

## 7) API (current)
Auth/middleware:
- Local dev auth bypass for tests; standard session elsewhere

Campaigns:
- POST `/api/campaigns` – create (manual)
- GET `/api/campaigns` – list (published)
- GET `/api/campaigns/[id]` – detail
- PUT `/api/campaigns/[id]` – update (owner/org-owner)
- POST `/api/campaigns/generate-from-repo` – generate from GitHub (autoCreate supported)
- POST `/api/campaigns/[id]/generate-image` – AI hero image
- Milestones: POST/GET/PUT/DELETE under `/api/campaigns/[id]/milestones` and `/[milestoneId]`
- Pledge Tiers: POST/GET/PUT/DELETE under `/api/campaigns/[id]/pledge-tiers` and `/[tierId]`
- Stretch Goals: POST/GET/PUT/DELETE under `/api/campaigns/[id]/stretch-goals` and `/[goalId]`

GitHub:
- POST `/api/github/connect` – store/test PAT; GET/DELETE to view/disconnect

Service Providers:
- POST `/api/services/generate-from-domain` – generate structured profile draft (returns JSON; DB save to be added)
- GET `/api/services/categories` – list service categories (existing)

Payments:
- POST `/api/checkout-session` – create checkout session (existing)
- POST `/api/payments/stripe/webhook` – Stripe webhooks (existing)

Images:
- POST `/api/images/generate`, `/api/images/search`, `/api/images/[id]/use`, `/api/images/[id]/delete`

## 8) Payments Model (MVP recommendation)
Goal: Ship faster without full escrow ledger.

Recommended MVP approach (no formal escrow):
- Use Stripe PaymentIntents + SetupIntent to store payment method for future off-session captures.
- Milestone 0 (M0): upon campaign fully funded/closed, capture 30% immediately (covers platform fee + initial work).
- Remaining milestones: capture percentages (e.g., M1 30–40%, M2 30–40%) upon acceptance events. Platform fee applied proportionally per capture.
- Refunds: partial refunds against last capture when disputes occur (simple policy for MVP).

Notes:
- This avoids managing a ledger and segregated accounts initially.
- We can add a true escrow ledger in v1 using Connect + platform-owned accounts if needed.

## 9) Compliance (MVP)
- Minimal: clear Terms, Refund policy, Privacy, and data retention.
- PCI handled by Stripe; never store PANs.

## 10) Architecture (actual)
- Frontend: Next.js 15 (App Router), TypeScript, RSC + Client Components.
- Backend: Next.js API routes + Prisma + PostgreSQL; Stripe integration.
- Storage: Vercel Blob/S3-compatible for images/artifacts.
- Auth: Session-based; GitHub PAT stored (encryption at rest is a needed improvement).
- AI: OpenAI for content generation; Perplexity for research.

Differences from prior draft:
- No NestJS; using Next.js API routes for now.
- No escrow ledger implemented yet.

## 11) Events (planned)
- campaign.created, campaign.published, milestone.submitted, milestone.accepted, milestone.rejected,
  payment.captured, payment.refunded, image.generated, github.connected.

## 12) Acceptance Tests (MVP)
- Campaign GitHub path: connect → generate → create draft → edit → publish.
- Campaign manual path: create draft → edit → publish.
- Milestone CRUD (owner): create/update/delete.
- Payment capture simulator: simulate M0 capture trigger and M1 acceptance capture (unit/integration double where real keys are absent).
- Service provider: waitlist → approve → domain → profile draft JSON → save (when model exists).

## 13) MVP Scope vs v1
MVP must-have:
- Auth, Campaign CRUD, GitHub generation, Milestone & Pledge Tier CRUD, Basic payments captures (no escrow), Admin publish, Image generation, Docs.

v1 targets:
- Escrow ledger + dispute board, Work orders & invoicing, Badges & evidence vault, Org SSO/KYC, Analytics.

## 14) Security
- Token handling: encrypt GitHub PAT at rest (todo).
- Input validation with Zod on APIs (done for new routes).
- Rate limiting for external APIs (basic limiter in search base; extend as needed).
- Stripe webhooks secured with signature verification.

## 15) GTM
- Seed 5–10 partner providers (smaht/sundai/tinkerer community) and publish directory.
- Seed ~5 campaigns (include 2–3 “already complete” exemplars with full milestones/evidence).

## 16) Gaps / Open Items
- Service Provider DB model + create/update/publish endpoints (the generator returns JSON only today).
- Payments: implement M0 + milestone capture endpoints + admin acceptance triggers.
- Encrypt GitHub tokens at rest; rotation policy.
- Admin review workflows (campaign and provider) – minimal UI toggle exists; formal workflow later.
- Tests: increase integration tests for wizard flows, generation endpoints, payments triggers.

