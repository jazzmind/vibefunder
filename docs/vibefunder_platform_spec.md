# VibeFunder.ai — Platform Planning Doc (Build‑Ready)

_Last updated August 02, 2025_

## 1) Vision
A marketplace where micro‑SaaS makers raise milestone‑escrowed funds from charter customers to harden prototypes into enterprise‑ready products. Platform takes 5% fee and margins on partner services.

## 2) Roles & Permissions
- **Maker (Founder):** create/edit campaign, connect repo, upload artifacts, request acceptance, book partner services.
- **Backer (Customer):** pledge funds, review evidence, accept/holdback/reject milestones, access license & escrow terms.
- **Partner (Vendor):** list services, accept work orders, upload deliverables, invoice via platform.
- **Platform Admin:** KYC/verification, dispute board ops, fee config, partner curation.
- **Auditor (read‑only):** view artifacts/notes for compliance (optional).

## 3) Core Objects
- **Campaign**: title, problem, solution, video, budget, milestones[], badges[], status, repo_url, deploy_modes[]
- **Milestone**: name, % payout, acceptance_criteria, evidence[], status, due_date
- **Pledge**: backer_id, campaign_id, amount, status (authorized|captured|refunded)
- **Escrow**: wallet_id, balances (m1/m2/m3), release_rules
- **Artifact**: type (pen_test, sbom, demo_video, slo_screenshot, restore_log), url, checksum
- **Badge**: code (SECURITY_READY, SOC2_TRACK, SSO_READY, PII_SAFE), status
- **PartnerService**: category, rate_card, sla, sample_deliverables
- **WorkOrder**: partner_id, campaign_id, scope, price, status, deliverables[]
- **License**: type (Lifetime, 5Year, OnPrem), terms_url, escrow_triggers
- **User**: role(s), org, idp (SAML/OIDC), verification_status

## 4) Key Flows (Happy Paths)
1. Maker creates Campaign → uploads demo → defines milestones & acceptance tests → requests listing review.  
2. Platform verifies Maker (KYC) → approves listing → campaign goes live.  
3. Backer pledges → funds authorized → when fully funded, M0 starts.  
4. Maker completes M1 → uploads evidence → Backers review → accept or holdback → escrow releases 30%.  
5. Repeat for M2 (40%) and M3 (30%).  
6. On completion, licenses issued; partners invoice; badges displayed.

## 5) Non‑Happy Paths
- Milestone rejected → cure window → re‑review → proportional refund if unresolved.  
- Maker default (abandon) → dispute board → partial refund + code escrow trigger.  
- Backer chargeback → freeze releases; initiate dispute.

## 6) Data Model (DDL sketch)
```sql
-- Postgres
create table users(id uuid primary key, email text unique, org_id uuid, roles text[], idp_sub text, created_at timestamptz default now());
create table campaigns(id uuid primary key, maker_id uuid references users(id), title text, summary text, budget_cents int,
  currency text default 'USD', status text, repo_url text, video_url text, deploy_modes text[], created_at timestamptz default now());
create table milestones(id uuid primary key, campaign_id uuid references campaigns(id), name text, pct int, due_date date,
  acceptance_json jsonb, status text, evidence jsonb default '[]'::jsonb);
create table pledges(id uuid primary key, campaign_id uuid references campaigns(id), backer_id uuid references users(id),
  amount_cents int, status text, payment_ref text, created_at timestamptz default now());
create table escrows(id uuid primary key, campaign_id uuid references campaigns(id), balances jsonb, rules jsonb);
create table artifacts(id uuid primary key, campaign_id uuid references campaigns(id), kind text, url text, checksum text, meta jsonb);
create table badges(id uuid primary key, campaign_id uuid references campaigns(id), code text, status text, evidence jsonb);
create table partner_services(id uuid primary key, partner_id uuid references users(id), category text, rate_card jsonb, sla jsonb);
create table work_orders(id uuid primary key, campaign_id uuid, partner_id uuid, scope jsonb, price_cents int, status text, deliverables jsonb);
create table licenses(id uuid primary key, campaign_id uuid references campaigns(id), type text, terms_url text, triggers jsonb);
```

## 7) API (REST, JWT + SSO; OpenAPI stub provided)
- Auth: OIDC login → JWT. Backers can also use API keys for finance operations (limited).  
- Idempotency‑keys on pledge & release endpoints.  
- Webhooks for milestone submissions, acceptance, and refund events.

## 8) Escrow & Payments
- Provider: Stripe (PaymentIntents, Connect, custom accounts) or Adyen.  
- Funds authorized at pledge; captured at campaign close; held in platform-owned segregated account with ledger for M1/M2/M3.  
- Release operations create transfers less 5% platform fee; partial refunds pro‑rata.

## 9) Compliance
- KYC/KYB on Makers & Partners.  
- Data Processing Addendum templates; subprocessor registry.  
- Optional SOC2‑Track evidence vault (files + attestations).

## 10) Architecture (suggested)
- **Frontend:** Next.js (App Router), TypeScript, React Server Components.  
- **Backend:** NestJS (Node), Postgres, Prisma, Redis (queues), OpenAPI.  
- **Storage:** S3-compatible for artifacts; signed URLs.  
- **Auth:** Auth0/WorkOS/Keycloak for SAML/OIDC.  
- **Infra:** AWS (ECS Fargate or Lambda), CloudFront, WAF, KMS.  
- **Observability:** OpenTelemetry, Prometheus, Loki; Alertmanager.  
- **AI modules:** Python microservices (FastAPI) for document parsing & scoring (optional).

## 11) Events (for agents)
- campaign.created, campaign.approved, pledge.authorized, pledge.captured, milestone.submitted, milestone.accepted, milestone.rejected, escrow.released, escrow.refunded, workorder.created, workorder.completed.

## 12) Acceptance Tests (platform)
- Create campaign → approve → fund → submit M1 → accept → auto-release 30% → ledger matches.  
- Reject with holdback → cure → accept → release remainder.  
- Dispute path exercises refund logic & escrow ledger.

## 13) Backlog (MVP → v1)
- MVP: Auth (OIDC), Campaign CRUD, Pledge/Checkout, Escrow Ledger, Milestone Workflow, Artifact Upload, Badges, Admin panel.  
- v1: Partner Marketplace, Work Orders & Invoicing, Dispute Board, Public badges, Analytics, Email notifications.

## 14) Security
- Role-based permissions; signed URLs; row-level security where possible.  
- Rate limits & WAF; audit logging for sensitive ops.  
- SBOM, SCA/DAST in CI; secrets scanning; dependency pinning.

## 15) GTM
- Seed with 3–5 flagship campaigns.  
- Publish milestone evidence & uptime stats; build trust.  
- Partner with 2–3 security vendors; revenue share.

