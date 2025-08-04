# CompetitionManager — Milestone Plan & Acceptance
**Date:** 2025-08-02

## Scope notes
- Deployment modes: SaaS / VPC / on-prem supported.
- Models: support for provider-agnostic LLMs with pluggable adapters; no training on customer data without consent.

## M0 — Spec & Risk Plan (0–2 weeks)
- Threat model, data flows, acceptance tests, backlog & velocity plan.
- Evidence: architecture doc, test plan, DPIA (if needed).
- Release: 0–10% (optional).

## M1 — Security & Identity (2–6 weeks) — Release 30%
- SSO (SAML/OIDC), RBAC, audit logging.
- SBOM; SCA/DAST; dependency pinning.
- Initial pen test & remediation plan.
- **Acceptance evidence:** demo, SSO/RBAC tests, pen test summary, SBOM/SCA reports.

## M2 — Reliability & Data (4–8 weeks) — Release 40%
- SLOs & alerting, error budgets.
- Backups/restore drill (RTO<4h, RPO<24h).
- Rate limits; usage metering.
- Admin console & data export (CSV/Parquet).
- **Acceptance evidence:** dashboards, restore drill video, rate limit tests, export samples.

## M3 — Compliance & Enterprise Fit (3–6 weeks) — Release 30%
- Security questionnaire pack (SIG Lite/CAIQ mapping), DPA, data retention policy.
- Deployment guides (SaaS/VPC/on-prem), runbooks.
- Badges: Security-Ready, SSO-Ready, PII-Safe (as applicable).
- **Acceptance evidence:** completed questionnaires, DPA template ready, guides uploaded.

## Product-specific acceptance criteria

- **Competition-specific:**
- Pilot challenge: ≥100 applications, ≥20 mentors, ≥10 judges; >90% judging completion.
- Real-time leaderboard and audit logs verified.
- Data exports to two specified systems validated.
- Accessibility audit (WCAG 2.1 AA) documented.

## Integrations (initial adapters)
- LMS/LTI (Canvas, Moodle) optional; Calendars (Google/Microsoft); Slack/Teams; Storage (Drive/OneDrive).
- CRM (Salesforce/HubSpot) and email (SendGrid).
- Auth: Okta, Azure AD; student IdP via SAML.
